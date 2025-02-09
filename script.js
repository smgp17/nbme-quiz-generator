// Load PDF.js and Tesseract.js
if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";
}

document.getElementById("upload-btn").addEventListener("click", handleFileUpload);
let quizData = [];
let currentQuestionIndex = 0;
let score = 0;

async function handleFileUpload() {
    const fileInput = document.getElementById("file-input");
    const files = fileInput.files;

    if (files.length === 0) {
        alert("Please select at least one PDF file.");
        return;
    }

    document.getElementById("progress").innerText = "Processing PDFs... Please wait.";

    try {
        let pdfPromises = Array.from(files).map(file => processPDF(file));
        let texts = await Promise.all(pdfPromises);
        let fullText = texts.join("\n\n");

        if (!fullText || fullText.trim().length === 0) {
            throw new Error("No text could be extracted. The PDF might be image-based.");
        }

        console.log("Extracted PDF Text:", fullText);
        alert("Extracted Text Preview: " + fullText.substring(0, 500));
        processPDFText(fullText);
    } catch (error) {
        document.getElementById("progress").innerText = "Error processing PDFs.";
        console.error("PDF Processing Error:", error);
        alert("Failed to process PDF: " + error.message);
    }
}

async function processPDF(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = async function () {
            try {
                const typedArray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

                let extractedText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();

                    if (textContent.items.length > 0) {
                        extractedText += textContent.items.map(item => item.str).join(" ") + "\n";
                    } else {
                        console.log(`Page ${i} contains images, using OCR...`);
                        extractedText += await extractTextFromImage(page);
                    }
                }
                resolve(extractedText);
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

async function extractTextFromImage(page) {
    try {
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        const imageData = canvas.toDataURL("image/png");

        console.log("OCR Processing Image...");
        const { data: { text } } = await Tesseract.recognize(imageData, 'eng');
        console.log("OCR Extracted Text:", text);
        alert("OCR Extracted Text Preview: " + text.substring(0, 500));

        return text;
    } catch (error) {
        console.error("OCR Processing Error:", error);
        return "";
    }
}