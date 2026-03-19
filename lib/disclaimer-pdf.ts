/**
 * Mandatory compliance block for jsPDF exports — uses copy from lib/disclaimer.ts.
 */

import { jsPDF } from "jspdf";
import {
  getDisclaimerText,
  getMethodologyDisclaimerTitle,
  resolveDisclaimerLocale,
} from "./disclaimer";

export type MandatoryCompliancePdfOptions = {
  margin: number;
  pageWidth: number;
  contentTop: number;
  /** Y position must stay above this (e.g. pageHeight - 14 for footer). */
  contentBottom: number;
  locale?: string | null;
  /**
   * If true (default), starts with doc.addPage() then calls onNewPage (e.g. letterhead).
   * If false, draws on the current page starting at contentTop.
   */
  startWithNewPage?: boolean;
  /** Called after each new page (including the first when startWithNewPage is true). */
  onNewPage?: () => void;
};

/**
 * Draws "Methodology & Disclaimer" + mandatory body. Handles page breaks inside the body.
 */
export function appendMandatoryCompliancePdfSection(
  doc: jsPDF,
  opts: MandatoryCompliancePdfOptions
): void {
  const {
    margin,
    pageWidth,
    contentTop,
    contentBottom,
    locale,
    startWithNewPage = true,
    onNewPage,
  } = opts;

  const loc = resolveDisclaimerLocale(locale);
  const title = getMethodologyDisclaimerTitle(loc);
  const body = getDisclaimerText(loc);
  const w = pageWidth - 2 * margin;

  if (startWithNewPage) {
    doc.addPage();
    onNewPage?.();
  }

  let y = contentTop;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > contentBottom) {
      doc.addPage();
      onNewPage?.();
      y = contentTop;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(75, 85, 99);
  const titleLines = doc.splitTextToSize(title, w);
  titleLines.forEach((line: string) => {
    ensureSpace(6);
    doc.text(line, margin, y);
    y += 5.5;
  });
  y += 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 110, 120);
  const bodyLines = doc.splitTextToSize(body, w);
  bodyLines.forEach((line: string) => {
    ensureSpace(5);
    doc.text(line, margin, y);
    y += 4.2;
  });
}
