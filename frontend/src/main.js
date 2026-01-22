import { file } from 'jszip';
import './style.css'

document.querySelector('#app').innerHTML = `
  <div>
    <div id="header-section">
      <h1>Email to PDF Converter</h1>
      <p>Convert your email documents to PDF format easily.</p>
    </div>
    </div>

    <div id="file-display">
      <div id="file-header">
        <h3>Documents</h3>
        <button id="open-modal-btn">Add Document</button>
      </div>
      <div id="file-list">
        <h3 id="converted-files">Converted Files:</h3>
      </div>
    </div>

    <div id="upload-modal" class="modal">
      <div class="modal-content">
        <h3>Add Document to Convert</h3>
        <label id="drop-zone">
          <input type="file" id="file-input" title="Choose Files"/>
          <div class="drag-text">or drag and drop them here</div>
        </label>
        <div class="modal-buttons">
          <button id="close-btn">Close</button>
          <button id="clear-btn">Clear</button>
          <button id="submit-btn">Submit</button>
        </div>
      </div>
    </div>
  </div>
`

// Get modal
var modal = document.getElementById("upload-modal");

// Open modal and display
var btn = document.getElementById("open-modal-btn");
btn.onclick = function() {
  modal.style.display = "block";
  // clear prev file links
  const fileLinks = document.querySelectorAll("#file-link");
  fileLinks.forEach(link => link.remove());
};

// close the modal when click close or outside modal
var closeBtn = document.getElementById("close-btn");
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
})
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

// clear files added
const clearBtn = document.getElementById("clear-btn");
const fileInput = document.getElementById("file-input");
clearBtn.addEventListener("click", () => {
  fileInput.value = "";
});

// submit files and convert
const submitBtn = document.getElementById("submit-btn");
submitBtn.addEventListener("click", async () => {
  // get files user added
  const files = document.getElementById("file-input").files;
  if (files.length === 0) return;
  const formData = new FormData();
  for (const file of files) {
    formData.append("file", file);
  }
  formData.append("outputFormat", "both");
  try {
    const response = await fetch("http://localhost:3000/convert/email", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      const blob = await response.blob();
      const jszip = await import('jszip');
      const zip = new jszip.default();
      const unzipped = await zip.loadAsync(blob);
      const fileList = document.getElementById("file-list");
      // for each file in zip create download link and display
      for (const [filename, file] of Object.entries(unzipped.files)) {
          const fileBlob = await file.async('blob');
          const url = window.URL.createObjectURL(fileBlob);
          const link = document.createElement('a');
          link.id="file-link";
          link.href = url;
          link.download = filename;
          link.textContent = filename;
          fileList.appendChild(link);
      }
      // display success message briefly
      const successMsg = document.createElement("p");
      successMsg.textContent = "✓ Files converted successfully!";
      successMsg.style.color = "green";
      setTimeout(() => successMsg.remove(), 3000);
      fileList.appendChild(successMsg);
      // exit modal
      modal.style.display = "none";
      fileInput.value = "";
    }
  } catch (error) {
    console.error("Conversion failed:", error);
  }
});

// drag and drop functionality
const dropZone = document.getElementById("drop-zone");
dropZone.addEventListener("drop", dropHandler);
window.addEventListener("drop", (e) => {
  if ([...e.dataTransfer.items].some((item) => item.kind === "file")) {
    e.preventDefault();
  }
});
dropZone.addEventListener("dragover", (e) => {
  const fileItems = [...e.dataTransfer.items].filter(
    (item) => item.kind === "file",
  );
  if (fileItems.length > 0) {
    e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
  }
});
function dropHandler(ev) {
  ev.preventDefault();
  const files = [...ev.dataTransfer.items]
    .map((item) => item.getAsFile())
    .filter((file) => file);
  displayFileName(files);
}

// prevent dragging files outside drop zone
window.addEventListener("dragover", (e) => {
  const fileItems = [...e.dataTransfer.items].filter(
    (item) => item.kind === "file",
  );
  if (fileItems.length > 0) {
    e.preventDefault();
    if (!dropZone.contains(e.target)) {
      e.dataTransfer.dropEffect = "none";
    }
  }
});
