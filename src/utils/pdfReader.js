import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function readFileText(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return await readPdfText(file);
  }
  return await file.text(); // .txt or others read as text
}

async function readPdfText(file) {
  const uint8 = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strings = content.items.map((it) => it.str || "");
    text += strings.join(" ") + "\n";
  }
  return text;
}
