/**
 * Checks which Unicode characters Cheerio returns for HTML named character references.
 * For example, &nbsp; becomes U+00A0, not a regular space.
 * Conclusion: If you handle text with named character references, use the decoded Unicode characters.
 */
import { load } from "cheerio";

const html = "<p>A&amp;B&nbsp;C</p>";
const $ = load(html);
const text = $("p").text();

console.log("HTML:", html);
console.log("Text:", text);
console.table(
  [...text].map((character) => ({
    character,
    unicode: `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
  })),
);

console.log("\n[---------------------&nbsp;---------------------]");
console.log("Split by whitespace (/\\s+/u):\t", text.split(/\s+/u));
console.log('Split by whitespace (" "):\t', text.split(" "));
console.log("Split by whitespace (\\u00A0):\t", text.split("\u00A0"));

console.log('Includes (" "):\t\t\t', text.includes(" ").toString());
console.log("Includes (\\u00A0):\t\t", text.includes("\u00A0").toString());

console.log("\n[---------------------&amp;---------------------]");
console.log("Split by amp (/&/u):\t\t", text.split(/&/u));
console.log('Split by amp ("&"):\t\t', text.split("&"));
console.log("Split by amp (\\u0026):\t\t", text.split("\u0026"));

console.log('Includes ("&"):\t\t\t', text.includes("&").toString());
console.log("Includes (\\u0026):\t\t", text.includes("\u0026").toString());
