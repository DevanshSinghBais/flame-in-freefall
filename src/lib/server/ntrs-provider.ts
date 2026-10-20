import "server-only";

export {
  getNtrsCitation,
  NtrsProviderError,
  NTRS_MAX_PAGE_SIZE,
  NTRS_MAX_RESULTS,
  searchNtrs,
} from "@/lib/ntrs-provider-core";
export type { NtrsSearchInput } from "@/lib/ntrs-provider-core";
