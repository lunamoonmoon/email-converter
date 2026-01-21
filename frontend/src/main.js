import './style.css'

document.querySelector('#app').innerHTML = `
  <div>
    <div id="header-section"></div>
      <h1>Email to PDF Converter</h1>
      <p>Convert your email documents to PDF format easily.</p>
    </div>

    <div id="file-display">
      <button id="open-modal-btn">Add Document</button>
    </div>

    <div id="upload-modal" class="modal">
      <div class="modal-content">
        <h3>Add Document to Convert</h3>
        <label id="drop-zone">
          <input type="file" id="file-input" title="Choose Files"/>
          <div class="drag-text">or drag and drop them here</div>
        </label>
        <ul id="preview"></ul>
        <div class="modal-buttons">
          <button id="close-btn">Close</button>
          <button id="clear-btn">Clear</button>
          <button id="submit-btn" disabled>Submit</button>
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

// submit files and convert
const submitBtn = document.getElementById("submit-btn");
submitBtn.addEventListener("click", async () => {
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
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted.pdf.zip";
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("Conversion failed:", error);
  }
});

// clear files added
const clearBtn = document.getElementById("clear-btn");
clearBtn.addEventListener("click", () => {
  preview.textContent = "";
  submitBtn.disabled = true;
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

// Show file names
const preview = document.getElementById("preview");
function displayFileName(files) {
  for (const file of files) {
      const li = document.createElement("li");
      li.appendChild(document.createTextNode(file.name));
      preview.appendChild(li);
  }
  // if files enable submit button
  submitBtn.disabled = false;
}
const fileInput = document.getElementById("file-input");
fileInput.addEventListener("change", (e) => {
  displayFileName(e.target.files);
});

