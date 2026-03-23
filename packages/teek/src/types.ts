/** The three kinds of entities teek manages */
export type EntityKind = "persona" | "role" | "agent";

/** Loaded entity ready for the LLM */
export interface TeekEntity {
  kind: EntityKind;
  name: string;
  displayName: string;
  profile: string;
  context: string;
}

/** Options for a teek chat call */
export interface AskOptions {
  system: string;
  maxTokens?: number;
}
