/* global importScripts */

// The public worker stays cacheable/offline; this static entry lets Next bundle
// the Worker URL without Turbopack's non-analyzable-constructor warning.
importScripts("/hadith-search.worker.js");
