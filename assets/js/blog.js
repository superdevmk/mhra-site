// KONFIGURIMI I GITHUB REPOS
const GITHUB_USER = "superdevmk";
const GITHUB_REPO = "mhra-site";
const GITHUB_BRANCH = "main";
const BLOG_PATH = "blog";

const apiURL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${BLOG_PATH}?ref=${GITHUB_BRANCH}`;

const lang = localStorage.getItem("mhra-lang") || "mk";
const READ_MORE_TEXT = lang === "en" ? "Read more" : "Прочитај повеќе";
const CLOSE_TEXT = lang === "en" ? "Close" : "Затвори";

const gridEl = document.getElementById("blog-grid");
const emptyEl = document.getElementById("blog-empty");
const modalEl = document.getElementById("blog-modal");
const modalTitleEl = document.getElementById("blog-modal-title");
const modalAuthorEl = document.getElementById("blog-modal-author");
const modalDateEl = document.getElementById("blog-modal-date");
const modalBodyEl = document.getElementById("blog-modal-body");

const postsData = [];

// Lexo listën e file-ve .md nga GitHub
fetch(apiURL)
  .then((res) => {
    if (!res.ok) throw new Error("Cannot load blog folder");
    return res.json();
  })
  .then((files) => {
    const mdFiles = files.filter((f) => f.name.endsWith(".md"));

    if (!mdFiles.length) {
      emptyEl.style.display = "block";
      return;
    }

    mdFiles.forEach((file, index) => {
      fetch(file.download_url)
        .then((r) => r.text())
        .then((md) => {
          const parsed = parseMarkdownWithFrontmatter(md);
          if (!parsed) return;

          const { meta, body } = parsed;

          // filtro sipas gjuhës
          if (meta.lang && meta.lang !== lang) return;

          const postId = postsData.length;
          postsData.push({
            id: postId,
            title: meta.title || file.name,
            author: meta.author || "",
            date: meta.date || "",
            body,
          });

          const shortBody =
            body.length > 150 ? body.substring(0, 150) + "..." : body;

          const card = document.createElement("article");
          card.className = "card";
          card.innerHTML = `
            <div class="card__eyebrow">${meta.date || ""}</div>
            <h3 class="card__title">${meta.title || ""}</h3>
            <div class="card__meta">${meta.author || ""}</div>
            <p class="card__body">${shortBody.replace(/\n/g, "<br>")}</p>
            <button class="btn btn--outline blog-readmore" data-id="${postId}">
              ${READ_MORE_TEXT}
            </button>
          `;
          gridEl.appendChild(card);
        })
        .catch((err) => {
          console.error("Error reading post", file.name, err);
        });
    });
  })
  .catch((err) => {
    console.error(err);
    emptyEl.style.display = "block";
  });

// PARSIM I THJESHTË I FRONTMATTER
function parseMarkdownWithFrontmatter(md) {
  md = md.trim();
  if (!md.startsWith("---")) {
    return { meta: {}, body: md };
  }

  const second = md.indexOf("\n---", 3);
  if (second === -1) {
    return { meta: {}, body: md };
  }

  const fmText = md.slice(3, second).trim();
  const body = md.slice(second + 4).trim();

  const meta = {};
  fmText.split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (!key || !rest.length) return;
    const value = rest.join(":").trim().replace(/^"|"$/g, "");
    meta[key.trim()] = value;
  });

  return { meta, body };
}

// EVENT: Read more -> hap modal
gridEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".blog-readmore");
  if (!btn) return;

  const id = parseInt(btn.dataset.id, 10);
  const post = postsData.find((p) => p.id === id);
  if (!post) return;

  openBlogModal(post);
});

function openBlogModal(post) {
  modalTitleEl.textContent = post.title;
  modalAuthorEl.textContent = post.author;
  modalDateEl.textContent = post.date;
  // thjesht newline -> <br>
  modalBodyEl.innerHTML = post.body
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  modalEl.classList.add("blog-modal--open");
  modalEl.setAttribute("aria-hidden", "false");
}

// Mbyllja e modalit
function closeBlogModal() {
  modalEl.classList.remove("blog-modal--open");
  modalEl.setAttribute("aria-hidden", "true");
}

modalEl.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("blog-modal__backdrop") ||
    e.target.classList.contains("blog-modal__close")
  ) {
    closeBlogModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeBlogModal();
  }
});

// Vendos tekstin "Close" brenda butonit (nëse s'është en mk)
const closeBtn = document.querySelector(".blog-modal__close");
if (closeBtn) closeBtn.title = CLOSE_TEXT;
