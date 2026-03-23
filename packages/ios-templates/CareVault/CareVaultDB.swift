import Foundation
import SQLite3

// MARK: - SQL Helpers

extension String {
    /// Escapes single quotes for safe SQL string interpolation.
    var sqlEscaped: String {
        self.replacingOccurrences(of: "'", with: "''")
    }
}

extension Optional where Wrapped == String {
    /// Returns a quoted SQL string literal or NULL.
    var sqlValue: String {
        switch self {
        case .none:        return "NULL"
        case .some(let v): return "'\(v.sqlEscaped)'"
        }
    }
}

// MARK: - Record Types

struct ScannedDocumentRecord: Identifiable {
    let id: String
    let childId: String
    let emailId: String
    let threadId: String?
    let subject: String
    let sender: String
    let senderDomain: String?
    let date: String
    let attachmentName: String?
    let attachmentType: String?
    let rawFilePath: String?
    let imported: Bool
    let documentType: CareSignalType
    let sizeBytes: Int
    let createdDate: String

    init(
        id: String = UUID().uuidString,
        childId: String,
        emailId: String,
        threadId: String? = nil,
        subject: String,
        sender: String,
        senderDomain: String? = nil,
        date: String,
        attachmentName: String? = nil,
        attachmentType: String? = nil,
        rawFilePath: String? = nil,
        imported: Bool = false,
        documentType: CareSignalType = .other,
        sizeBytes: Int = 0,
        createdDate: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.childId = childId
        self.emailId = emailId
        self.threadId = threadId
        self.subject = subject
        self.sender = sender
        self.senderDomain = senderDomain
        self.date = date
        self.attachmentName = attachmentName
        self.attachmentType = attachmentType
        self.rawFilePath = rawFilePath
        self.imported = imported
        self.documentType = documentType
        self.sizeBytes = sizeBytes
        self.createdDate = createdDate
    }

    init(from stmt: OpaquePointer) {
        id             = String(cString: sqlite3_column_text(stmt, 0))
        childId        = String(cString: sqlite3_column_text(stmt, 1))
        emailId        = String(cString: sqlite3_column_text(stmt, 2))
        threadId       = sqlite3_column_text(stmt, 3).map { String(cString: $0) }
        subject        = String(cString: sqlite3_column_text(stmt, 4))
        sender         = String(cString: sqlite3_column_text(stmt, 5))
        senderDomain   = sqlite3_column_text(stmt, 6).map { String(cString: $0) }
        date           = String(cString: sqlite3_column_text(stmt, 7))
        attachmentName = sqlite3_column_text(stmt, 8).map { String(cString: $0) }
        attachmentType = sqlite3_column_text(stmt, 9).map { String(cString: $0) }
        rawFilePath    = sqlite3_column_text(stmt, 10).map { String(cString: $0) }
        imported       = sqlite3_column_int(stmt, 11) != 0
        let typeRaw    = sqlite3_column_text(stmt, 12).map { String(cString: $0) } ?? "other"
        documentType   = CareSignalType(rawValue: typeRaw) ?? .other
        sizeBytes      = Int(sqlite3_column_int64(stmt, 13))
        createdDate    = String(cString: sqlite3_column_text(stmt, 14))
    }
}

struct CareProviderRecord: Identifiable {
    let id: String
    let childId: String
    let name: String
    let domain: String?
    let type: String
    let discoveredFrom: String?
    let createdDate: String

    init(
        id: String = UUID().uuidString,
        childId: String,
        name: String,
        domain: String? = nil,
        type: String = "other",
        discoveredFrom: String? = nil,
        createdDate: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.childId = childId
        self.name = name
        self.domain = domain
        self.type = type
        self.discoveredFrom = discoveredFrom
        self.createdDate = createdDate
    }

    init(from stmt: OpaquePointer) {
        id             = String(cString: sqlite3_column_text(stmt, 0))
        childId        = String(cString: sqlite3_column_text(stmt, 1))
        name           = String(cString: sqlite3_column_text(stmt, 2))
        domain         = sqlite3_column_text(stmt, 3).map { String(cString: $0) }
        type           = String(cString: sqlite3_column_text(stmt, 4))
        discoveredFrom = sqlite3_column_text(stmt, 5).map { String(cString: $0) }
        createdDate    = String(cString: sqlite3_column_text(stmt, 6))
    }
}

struct InsightRecord: Identifiable {
    let id: String
    let childId: String
    let type: String
    let summary: String
    let linkedDocumentIds: String?
    let linkedFactIds: String?
    let generatedDate: String
    let status: String

    init(
        id: String = UUID().uuidString,
        childId: String,
        type: String,
        summary: String,
        linkedDocumentIds: String? = nil,
        linkedFactIds: String? = nil,
        generatedDate: String = ISO8601DateFormatter().string(from: Date()),
        status: String = "new"
    ) {
        self.id = id
        self.childId = childId
        self.type = type
        self.summary = summary
        self.linkedDocumentIds = linkedDocumentIds
        self.linkedFactIds = linkedFactIds
        self.generatedDate = generatedDate
        self.status = status
    }

    init(from stmt: OpaquePointer) {
        id                = String(cString: sqlite3_column_text(stmt, 0))
        childId           = String(cString: sqlite3_column_text(stmt, 1))
        type              = String(cString: sqlite3_column_text(stmt, 2))
        summary           = String(cString: sqlite3_column_text(stmt, 3))
        linkedDocumentIds = sqlite3_column_text(stmt, 4).map { String(cString: $0) }
        linkedFactIds     = sqlite3_column_text(stmt, 5).map { String(cString: $0) }
        generatedDate     = String(cString: sqlite3_column_text(stmt, 6))
        status            = String(cString: sqlite3_column_text(stmt, 7))
    }
}

// MARK: - CareVaultDB

/// On-device SQLite database for CareVault.
/// All data stays on device — no cloud sync.
///
/// Usage:
///   let db = CareVaultDB.shared
///   db.insertChild(id: UUID().uuidString, name: "Alex", dateOfBirth: "2018-06-01", state: "NY")
final class CareVaultDB {

    static let shared = CareVaultDB()

    private var db: OpaquePointer?

    private init() {
        openDatabase()
        configurePragmas()
        createTables()
        createIndexes()
    }

    deinit {
        sqlite3_close(db)
    }

    // MARK: - Setup

    private func openDatabase() {
        let url = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)
            .first!
            .appendingPathComponent("carevault.db")

        if sqlite3_open(url.path, &db) != SQLITE_OK {
            let msg = db.flatMap { String(cString: sqlite3_errmsg($0)) } ?? "unknown error"
            print("[CareVaultDB] Failed to open database: \(msg)")
        }
    }

    private func configurePragmas() {
        exec("PRAGMA journal_mode = WAL;")
        exec("PRAGMA foreign_keys = ON;")
    }

    private func createTables() {
        exec("""
            CREATE TABLE IF NOT EXISTS children (
                id                TEXT PRIMARY KEY,
                name              TEXT NOT NULL,
                date_of_birth     TEXT,
                state             TEXT,
                diagnosis_status  TEXT NOT NULL DEFAULT 'suspected',
                created_date      TEXT NOT NULL
            );
        """)

        exec("""
            CREATE TABLE IF NOT EXISTS email_accounts (
                id              TEXT PRIMARY KEY,
                provider        TEXT NOT NULL DEFAULT 'gmail',
                last_scan_date  TEXT
            );
        """)

        exec("""
            CREATE TABLE IF NOT EXISTS care_providers (
                id              TEXT PRIMARY KEY,
                child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
                name            TEXT NOT NULL,
                domain          TEXT,
                type            TEXT NOT NULL DEFAULT 'other',
                discovered_from TEXT,
                created_date    TEXT NOT NULL
            );
        """)

        exec("""
            CREATE TABLE IF NOT EXISTS provider_contacts (
                id          TEXT PRIMARY KEY,
                provider_id TEXT NOT NULL REFERENCES care_providers(id) ON DELETE CASCADE,
                name        TEXT,
                email       TEXT,
                role        TEXT
            );
        """)

        exec("""
            CREATE TABLE IF NOT EXISTS scanned_documents (
                id              TEXT PRIMARY KEY,
                child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
                email_id        TEXT NOT NULL UNIQUE,
                thread_id       TEXT,
                subject         TEXT NOT NULL,
                sender          TEXT NOT NULL,
                sender_domain   TEXT,
                date            TEXT NOT NULL,
                attachment_name TEXT,
                attachment_type TEXT,
                raw_file_path   TEXT,
                imported        INTEGER NOT NULL DEFAULT 0,
                document_type   TEXT NOT NULL DEFAULT 'other',
                size_bytes      INTEGER NOT NULL DEFAULT 0,
                created_date    TEXT NOT NULL
            );
        """)

        exec("""
            CREATE TABLE IF NOT EXISTS extracted_facts (
                id               TEXT PRIMARY KEY,
                document_id      TEXT NOT NULL REFERENCES scanned_documents(id) ON DELETE CASCADE,
                fact_type        TEXT NOT NULL,
                value            TEXT NOT NULL,
                confidence       REAL NOT NULL DEFAULT 1.0,
                source_range     TEXT,
                extraction_date  TEXT NOT NULL
            );
        """)

        exec("""
            CREATE TABLE IF NOT EXISTS deadlines (
                id                 TEXT PRIMARY KEY,
                child_id           TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
                title              TEXT NOT NULL,
                date               TEXT NOT NULL,
                source_document_id TEXT REFERENCES scanned_documents(id) ON DELETE SET NULL,
                status             TEXT NOT NULL DEFAULT 'upcoming'
            );
        """)

        exec("""
            CREATE TABLE IF NOT EXISTS insights (
                id                  TEXT PRIMARY KEY,
                child_id            TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
                type                TEXT NOT NULL,
                summary             TEXT NOT NULL,
                linked_document_ids TEXT,
                linked_fact_ids     TEXT,
                generated_date      TEXT NOT NULL,
                status              TEXT NOT NULL DEFAULT 'new'
            );
        """)
        createTypedProfileTables()
    }


    // MARK: - Typed Profile Tables

    private func createTypedProfileTables() {
        let runTable = exec
        let tables = [
            "CREATE TABLE IF NOT EXISTS care_team_members (id INTEGER PRIMARY KEY AUTOINCREMENT, child_id INTEGER NOT NULL, name TEXT NOT NULL, domain TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'other', organization TEXT, last_contact_date TEXT, confirmed_by_parent INTEGER NOT NULL DEFAULT 0, created_date TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (child_id) REFERENCES children(id));",
            "CREATE TABLE IF NOT EXISTS care_goals (id INTEGER PRIMARY KEY AUTOINCREMENT, child_id INTEGER NOT NULL, goal_text TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'other', target_date TEXT, status TEXT NOT NULL DEFAULT 'active', source_email_id TEXT, source_document_id INTEGER, created_date TEXT NOT NULL DEFAULT (datetime('now')), superseded_by INTEGER, FOREIGN KEY (child_id) REFERENCES children(id));",
            "CREATE TABLE IF NOT EXISTS care_services (id INTEGER PRIMARY KEY AUTOINCREMENT, child_id INTEGER NOT NULL, service_type TEXT NOT NULL, frequency TEXT NOT NULL, provider_domain TEXT, auth_status TEXT, auth_expiry TEXT, start_date TEXT, source_email_id TEXT, superseded_by INTEGER, FOREIGN KEY (child_id) REFERENCES children(id));",
            "CREATE TABLE IF NOT EXISTS care_evals (id INTEGER PRIMARY KEY AUTOINCREMENT, child_id INTEGER NOT NULL, eval_type TEXT NOT NULL, date TEXT NOT NULL, provider_name TEXT, scores_json TEXT, key_findings TEXT, source_email_id TEXT, source_document_id INTEGER, FOREIGN KEY (child_id) REFERENCES children(id));",
            "CREATE TABLE IF NOT EXISTS care_timeline_events (id INTEGER PRIMARY KEY AUTOINCREMENT, child_id INTEGER NOT NULL, event_description TEXT NOT NULL, event_date TEXT NOT NULL, event_type TEXT NOT NULL, source_email_id TEXT, FOREIGN KEY (child_id) REFERENCES children(id));",
            "CREATE TABLE IF NOT EXISTS care_signals (id INTEGER PRIMARY KEY AUTOINCREMENT, child_id INTEGER NOT NULL, signal_type TEXT NOT NULL, summary TEXT NOT NULL, sender_domain TEXT, email_id TEXT, email_date TEXT, email_subject TEXT, email_sender TEXT, email_body_snippet TEXT, read INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (child_id) REFERENCES children(id));",
            "CREATE TABLE IF NOT EXISTS care_facts (id INTEGER PRIMARY KEY AUTOINCREMENT, child_id INTEGER NOT NULL, fact_type TEXT NOT NULL, fact_value TEXT NOT NULL, confidence TEXT NOT NULL DEFAULT 'medium', source_email_id TEXT, source_document_id INTEGER, created_date TEXT NOT NULL DEFAULT (datetime('now')), superseded_by INTEGER, FOREIGN KEY (child_id) REFERENCES children(id));"
        ]
        tables.forEach { _ = runTable($0) }
    }

    private func createIndexes() {
        exec("CREATE INDEX IF NOT EXISTS idx_docs_child      ON scanned_documents(child_id);")
        exec("CREATE INDEX IF NOT EXISTS idx_docs_email      ON scanned_documents(email_id);")
        exec("CREATE INDEX IF NOT EXISTS idx_docs_thread     ON scanned_documents(thread_id);")
        exec("CREATE INDEX IF NOT EXISTS idx_facts_doc       ON extracted_facts(document_id);")
        exec("CREATE INDEX IF NOT EXISTS idx_deadlines_child ON deadlines(child_id);")
        exec("CREATE INDEX IF NOT EXISTS idx_insights_child  ON insights(child_id);")
    }

    // MARK: - CRUD: Children

    @discardableResult
    func insertChild(
        id: String,
        name: String,
        dateOfBirth: String?,
        state: String?,
        diagnosisStatus: String = "suspected"
    ) -> Bool {
        let createdDate = ISO8601DateFormatter().string(from: Date())
        let sql = """
            INSERT OR IGNORE INTO children (id, name, date_of_birth, state, diagnosis_status, created_date)
            VALUES ('\(id.sqlEscaped)', '\(name.sqlEscaped)', \(dateOfBirth.sqlValue), \(state.sqlValue),
                    '\(diagnosisStatus.sqlEscaped)', '\(createdDate)');
        """
        return exec(sql)
    }

    // MARK: - CRUD: Documents

    @discardableResult
    func insertDocument(_ doc: ScannedDocumentRecord) -> Bool {
        let sql = """
            INSERT OR IGNORE INTO scanned_documents
                (id, child_id, email_id, thread_id, subject, sender, sender_domain, date,
                 attachment_name, attachment_type, raw_file_path, imported,
                 document_type, size_bytes, created_date)
            VALUES (
                '\(doc.id.sqlEscaped)',
                '\(doc.childId.sqlEscaped)',
                '\(doc.emailId.sqlEscaped)',
                \(doc.threadId.sqlValue),
                '\(doc.subject.sqlEscaped)',
                '\(doc.sender.sqlEscaped)',
                \(doc.senderDomain.sqlValue),
                '\(doc.date.sqlEscaped)',
                \(doc.attachmentName.sqlValue),
                \(doc.attachmentType.sqlValue),
                \(doc.rawFilePath.sqlValue),
                \(doc.imported ? 1 : 0),
                '\(doc.documentType.rawValue)',
                \(doc.sizeBytes),
                '\(doc.createdDate.sqlEscaped)'
            );
        """
        return exec(sql)
    }

    @discardableResult
    func markImported(documentId: String, filePath: String) -> Bool {
        let sql = """
            UPDATE scanned_documents
            SET imported = 1, raw_file_path = '\(filePath.sqlEscaped)'
            WHERE id = '\(documentId.sqlEscaped)';
        """
        return exec(sql)
    }

    func documents(forChild childId: String, importedOnly: Bool = false) -> [ScannedDocumentRecord] {
        var sql = """
            SELECT id, child_id, email_id, thread_id, subject, sender, sender_domain, date,
                   attachment_name, attachment_type, raw_file_path, imported,
                   document_type, size_bytes, created_date
            FROM scanned_documents
            WHERE child_id = '\(childId.sqlEscaped)'
        """
        if importedOnly { sql += " AND imported = 1" }
        sql += " ORDER BY date DESC;"
        return query(sql) { ScannedDocumentRecord(from: $0) }
    }

    // MARK: - CRUD: Providers

    @discardableResult
    func insertProvider(_ provider: CareProviderRecord) -> Bool {
        let sql = """
            INSERT OR IGNORE INTO care_providers
                (id, child_id, name, domain, type, discovered_from, created_date)
            VALUES (
                '\(provider.id.sqlEscaped)',
                '\(provider.childId.sqlEscaped)',
                '\(provider.name.sqlEscaped)',
                \(provider.domain.sqlValue),
                '\(provider.type.sqlEscaped)',
                \(provider.discoveredFrom.sqlValue),
                '\(provider.createdDate.sqlEscaped)'
            );
        """
        return exec(sql)
    }

    func providers(forChild childId: String) -> [CareProviderRecord] {
        let sql = """
            SELECT id, child_id, name, domain, type, discovered_from, created_date
            FROM care_providers
            WHERE child_id = '\(childId.sqlEscaped)'
            ORDER BY name ASC;
        """
        return query(sql) { CareProviderRecord(from: $0) }
    }

    // MARK: - CRUD: Insights

    @discardableResult
    func insertInsight(_ insight: InsightRecord) -> Bool {
        let sql = """
            INSERT OR IGNORE INTO insights
                (id, child_id, type, summary, linked_document_ids, linked_fact_ids,
                 generated_date, status)
            VALUES (
                '\(insight.id.sqlEscaped)',
                '\(insight.childId.sqlEscaped)',
                '\(insight.type.sqlEscaped)',
                '\(insight.summary.sqlEscaped)',
                \(insight.linkedDocumentIds.sqlValue),
                \(insight.linkedFactIds.sqlValue),
                '\(insight.generatedDate.sqlEscaped)',
                '\(insight.status.sqlEscaped)'
            );
        """
        return exec(sql)
    }

    func insights(forChild childId: String) -> [InsightRecord] {
        let sql = """
            SELECT id, child_id, type, summary, linked_document_ids, linked_fact_ids,
                   generated_date, status
            FROM insights
            WHERE child_id = '\(childId.sqlEscaped)'
            ORDER BY generated_date DESC;
        """
        return query(sql) { InsightRecord(from: $0) }
    }

    // MARK: - Internal Helpers

    @discardableResult
    private func exec(_ sql: String) -> Bool {
        var errorMsg: UnsafeMutablePointer<CChar>?
        let result = sqlite3_exec(db, sql, nil, nil, &errorMsg)
        if result != SQLITE_OK {
            let msg = errorMsg.map { String(cString: $0) } ?? "unknown error"
            print("[CareVaultDB] SQL error: \(msg)\nSQL: \(sql)")
            sqlite3_free(errorMsg)
            return false
        }
        return true
    }

    private func query<T>(_ sql: String, parse: (OpaquePointer) -> T) -> [T] {
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            let msg = db.flatMap { String(cString: sqlite3_errmsg($0)) } ?? "unknown error"
            print("[CareVaultDB] Prepare error: \(msg)\nSQL: \(sql)")
            return []
        }
        defer { sqlite3_finalize(stmt) }

        var results: [T] = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            results.append(parse(stmt!))
        }
        return results
    }
}
