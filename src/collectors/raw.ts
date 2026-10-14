import type { RawPayloadInput } from "../normalization/types.js";

import { sanitizeRawPayload } from "./raw-policy.js";

export interface RawPayloadSink {
  saveRawPayload(payload: RawPayloadInput): Promise<void>;
}

export class RawPayloadCollector {
  async collect(input: RawPayloadInput, sink?: RawPayloadSink): Promise<RawPayloadInput> {
    const captured = sanitizeRawPayload({ ...input, retrievedAt: input.retrievedAt ?? new Date().toISOString() });
    // This happens before any normalized record is processed.
    await sink?.saveRawPayload(captured);
    return captured;
  }
}
