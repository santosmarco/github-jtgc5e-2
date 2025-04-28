import type { OmitIndexSignature } from "type-fest";

import type { Json } from "../supabase/database.types";

/**
 * Converts a JSON object into an XML string
 * @param json - The JSON object to convert
 * @param rootName - The name of the root element
 * @param indentSize - The number of spaces to indent the XML
 * @returns The XML string
 */
export function transformJsonIntoXml(
  json: OmitIndexSignature<Json>,
  rootName = "root",
  indentSize = 2,
): string {
  const indent = (level: number): string => " ".repeat(indentSize * level);

  let xml = `<${rootName}>\n`;

  const convertToXml = (
    obj: Json,
    level: number,
    parentTag?: string,
  ): string => {
    if (obj === null) {
      return `${indent(level)}<${parentTag || "null"} />`;
    }

    if (typeof obj === "object" && !Array.isArray(obj)) {
      let result = "";
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (value === null || value === undefined) {
            result += `${indent(level)}<${key} />\n`;
          } else if (typeof value !== "object") {
            result += `${indent(level)}<${key}>${escapeXml(String(value))}</${key}>\n`;
          } else {
            const innerXml = convertToXml(value, level + 1);
            result += `${indent(level)}<${key}>\n${innerXml}${indent(level)}</${key}>\n`;
          }
        }
      }
      return result;
    }

    if (Array.isArray(obj)) {
      let result = "";
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        if (item === null || item === undefined) {
          result += `${indent(level)}<item index="${i}" />\n`;
        } else {
          const innerXml = convertToXml(item, level + 1);
          result += `${indent(level)}<item index="${i}">\n${innerXml}${indent(level)}</item>\n`;
        }
      }
      return result;
    }

    return escapeXml(String(obj));
  };

  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  xml += convertToXml(json, 1);
  xml += `</${rootName}>`;

  return xml;
}
