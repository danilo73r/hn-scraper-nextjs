/**
 * Compares parsing algorithms for the points/comments pattern:
 * number + space + singular/plural word. It uses comments as input;
 * points use the same algorithm with a different label.
 * Conclusion: parseWithSplit is one of the best.
 */
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { Bench } from "tinybench";

const measuredRounds = 5000;
const warmupRounds = 5;
const samples = [
  "0 comments",
  "1\u00A0comment",
  "7 comments",
  "35\u00A0comments",
  "120 comments",
  "1000\u00A0comments",
];
const expectedValues = [0, 1, 7, 35, 120, 1000];

function parseWithSplit(text) {
  const trimmedText = text.trim();
  const separator = trimmedText.includes(" ") ? " " : "\u00A0";
  const parts = trimmedText.split(separator);
  const commentsNum = Number(parts[0]);

  const isValidFormat = parts.length === 2;
  const isValidNumber = Number.isSafeInteger(commentsNum) && commentsNum >= 0;
  const isValidLabel = parts[1] === "comment" || parts[1] === "comments";

  if (!isValidFormat || !isValidNumber || !isValidLabel) {
    throw new Error(`Invalid comments: ${text}`);
  }

  return commentsNum;
}

function parseWithStartsWith(text) {
  const trimmedText = text.trim();
  const separator = trimmedText.includes(" ") ? " " : "\u00A0";
  const parts = trimmedText.split(separator);
  const commentsNum = Number(parts[0]);

  const isValidFormat = parts.length === 2;
  const isValidNumber = Number.isSafeInteger(commentsNum) && commentsNum >= 0;
  const isValidLabel = parts[1]?.startsWith("comment") ?? false;

  if (!isValidFormat || !isValidNumber || !isValidLabel) {
    throw new Error(`Invalid comments: ${text}`);
  }

  return commentsNum;
}

function parseWithIndexOf(text) {
  const trimmedText = text.trim();
  let separatorIndex = trimmedText.indexOf(" ");
  if (separatorIndex === -1) {
    separatorIndex = trimmedText.indexOf("\u00A0");
  }

  const commentsNum = Number(trimmedText.slice(0, separatorIndex));
  const label = trimmedText.slice(separatorIndex + 1);
  const isValidFormat = separatorIndex > 0;
  const isValidNumber = Number.isSafeInteger(commentsNum) && commentsNum >= 0;
  const isValidLabel = label === "comment" || label === "comments";

  if (!isValidFormat || !isValidNumber || !isValidLabel) {
    throw new Error(`Invalid comments: ${text}`);
  }

  return commentsNum;
}

function parseWithRegex(text) {
  const match = text.trim().match(/^(\d+)\s+comments?$/u);
  const commentsNumber = match ? Number(match[1]) : Number.NaN;
  const isValidNumber =
    Number.isSafeInteger(commentsNumber) && commentsNumber >= 0;

  if (!isValidNumber) {
    throw new Error(`Invalid comments: ${text}`);
  }

  return commentsNumber;
}

const methods = [
  { name: "split", parse: parseWithSplit },
  { name: "split + startsWith", parse: parseWithStartsWith },
  { name: "indexOf + slice", parse: parseWithIndexOf },
  { name: "regex", parse: parseWithRegex },
];

function runBenchmark(recordCount) {
  // Prepare input outside the timed section.
  const records = Array.from(
    { length: recordCount },
    (_, index) => samples[index % samples.length],
  );
  const expectedChecksum = records.reduce(
    (total, _, index) => total + expectedValues[index % samples.length],
    0,
  );
  const benchmark = new Bench({
    iterations: measuredRounds,
    time: 0, // Use a fixed number of rounds instead of a time budget.
    warmupIterations: warmupRounds,
    warmupTime: 0,
    throws: true,
  });
  const checksums = methods.map(() => 0);

  // Check each result before timing. Only valid inputs shared by all variants.
  for (const method of methods) {
    samples.forEach((text, index) =>
      assert.equal(method.parse(text), expectedValues[index]),
    );
  }

  methods.forEach((method, index) => {
    benchmark.add(
      method.name,
      () => {
        let checksum = 0;
        for (const text of records) {
          checksum += method.parse(text);
        }
        checksums[index] = checksum;
      },
      { async: false },
    );
  });

  benchmark.runSync();
  // Verify the consumed results outside the timed section.
  checksums.forEach((checksum) => assert.equal(checksum, expectedChecksum));

  return benchmark.tasks.map((task) => {
    const { latency } = task.result;
    return {
      method: task.name,
      records: recordCount,
      rounds: latency.samplesCount,
      medianMs: Number(latency.p50.toFixed(6)),
      minMs: Number(latency.min.toFixed(6)),
      maxMs: Number(latency.max.toFixed(6)),
    };
  });
}

console.log("comments benchmark — Node", process.version);
console.log('Half the inputs use " " half use the HTML space (&nbsp;)');
console.log("Only text parsing is measured, without considering HTML.");

const benchmarkStart = performance.now();
const results = [30, 10_000].flatMap((recordCount) =>
  runBenchmark(recordCount),
);
const totalSeconds = (performance.now() - benchmarkStart) / 1000;

console.table(results);
console.log(`Total benchmark time: ${totalSeconds.toFixed(2)} seconds.`);
