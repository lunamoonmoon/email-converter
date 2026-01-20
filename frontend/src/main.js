import './style.css'

document.querySelector('#app').innerHTML = `
  <div>
    <h3>Choose file to convert:</h3>
    <label id="drop-zone">
    Drop images here, or click to upload.
    <input type="file" id="file-input"/>
    </label>
    <ul id="preview"></ul>
    <button id="clear-btn">Clear</button>
    <button id="submit-btn">Submit</button>
  </div>
`

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
const preview = document.getElementById("preview");

function displayImages(files) {
  for (const file of files) {
      const li = document.createElement("li");
      li.appendChild(document.createTextNode(file.name));
      preview.appendChild(li);
  }
}

function dropHandler(ev) {
  ev.preventDefault();
  const files = [...ev.dataTransfer.items]
    .map((item) => item.getAsFile())
    .filter((file) => file);
  displayImages(files);
}
const fileInput = document.getElementById("file-input");
fileInput.addEventListener("change", (e) => {
  displayImages(e.target.files);
});
const clearBtn = document.getElementById("clear-btn");
clearBtn.addEventListener("click", () => {
  preview.textContent = "";
});
