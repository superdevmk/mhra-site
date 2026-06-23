(function () {
  const config = window.MHRA_ADMIN_CONFIG || {};
  const TABLE = config.table;
  const BUCKET = config.bucket;
  const PAGE_TITLE = config.title || "Admin";

  let quill = null;
  let editingId = null;
  let coverUrl = null;
  let albumImages = [];
  let coverPreviewObjectUrl = null;
  let albumPendingPreviewUrls = [];

  const formEl = () => document.getElementById("admin-form");
  const statusEl = () => document.getElementById("admin-form-status");
  const headingEl = () => document.getElementById("admin-form-heading");
  const modeEl = () => document.getElementById("admin-form-mode");
  const submitBtnEl = () => document.getElementById("admin-submit-btn");
  const resetBtnEl = () => document.getElementById("admin-reset-btn");

  function setStatus(msg, isError) {
    const el = statusEl();
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("admin-form-status--error", !!isError);
    el.classList.toggle("admin-form-status--success", !!msg && !isError);
  }

  function setEditorModeUI(isEditing, itemTitle) {
    if (headingEl()) {
      headingEl().textContent = isEditing ? "Edit content" : "Create new content";
    }
    if (modeEl()) {
      if (isEditing) {
        modeEl().style.display = "block";
        modeEl().hidden = false;
        modeEl().textContent = itemTitle
          ? `Editing: ${itemTitle}`
          : editingId
            ? `Editing item #${editingId}`
            : "Editing";
      } else {
        modeEl().style.display = "none";
        modeEl().hidden = true;
        modeEl().textContent = "";
      }
    }
    if (submitBtnEl()) {
      submitBtnEl().textContent = isEditing ? "Save changes" : "Create & publish";
    }
    if (resetBtnEl()) {
      resetBtnEl().textContent = isEditing ? "Cancel edit" : "Clear form";
    }
    document.getElementById("admin-form-panel")?.classList.toggle("admin-form-panel--editing", isEditing);
  }

  function highlightEditingRow(id) {
    document.querySelectorAll("#admin-table tbody tr[data-row-id]").forEach((tr) => {
      tr.classList.toggle("admin-table__row--editing", Number(tr.dataset.rowId) === Number(id));
    });
  }

  function revokeCoverPreviewUrl() {
    if (coverPreviewObjectUrl) {
      URL.revokeObjectURL(coverPreviewObjectUrl);
      coverPreviewObjectUrl = null;
    }
  }

  function revokeAlbumPendingPreviews() {
    albumPendingPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    albumPendingPreviewUrls = [];
  }

  function buildImagesPayload(finalCover, albumUrls) {
    const images = [];
    if (finalCover) images.push(finalCover);
    albumUrls.forEach((url) => {
      if (url && url !== finalCover && !images.includes(url)) images.push(url);
    });
    return images;
  }

  function renderCoverPreview() {
    const el = document.getElementById("admin-cover-preview");
    if (!el) return;

    const coverFile = document.getElementById("admin-cover-file")?.files?.[0];
    let previewSrc = coverUrl;

    revokeCoverPreviewUrl();
    if (coverFile) {
      coverPreviewObjectUrl = URL.createObjectURL(coverFile);
      previewSrc = coverPreviewObjectUrl;
    }

    if (!previewSrc) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }

    el.hidden = false;
    el.innerHTML = `
      <figure class="admin-cover-preview__figure">
        <img src="${escapeHtml(previewSrc)}" alt="" loading="lazy">
        <figcaption>${coverFile ? "New cover" : "Current cover"}</figcaption>
      </figure>`;
  }

  function renderAlbumPreview() {
    const el = document.getElementById("admin-album-preview");
    if (!el) return;

    const hasSaved = albumImages.length > 0;
    const hasPending = albumPendingPreviewUrls.length > 0;

    if (!hasSaved && !hasPending) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }

    el.hidden = false;
    el.innerHTML = `
      <div class="admin-existing-images__grid">
        ${albumImages
          .map(
            (url, index) => `
          <figure class="admin-existing-images__item">
            <img src="${escapeHtml(url)}" alt="" loading="lazy">
            <button type="button" class="btn btn--outline btn--sm" data-remove-album="${index}">Remove</button>
          </figure>`
          )
          .join("")}
        ${albumPendingPreviewUrls
          .map(
            (url) => `
          <figure class="admin-existing-images__item admin-existing-images__item--pending">
            <span class="admin-cover-badge admin-cover-badge--new">New</span>
            <img src="${escapeHtml(url)}" alt="" loading="lazy">
          </figure>`
          )
          .join("")}
      </div>`;
  }

  function refreshAlbumPendingPreviews() {
    revokeAlbumPendingPreviews();
    const files = document.getElementById("admin-album-files")?.files;
    if (files?.length) {
      albumPendingPreviewUrls = Array.from(files).map((file) => URL.createObjectURL(file));
    }
    renderAlbumPreview();
  }

  async function getCurrentUserId() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  }

  async function uploadGalleryFiles(files) {
    if (!files || !files.length) return [];
    const urls = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabaseClient.storage.from(BUCKET).upload(path, file);
      if (error) throw error;
      const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function loadList(lang) {
    const tbody = document.querySelector("#admin-table tbody");
    if (!tbody) return;

    const { data, error } = await supabaseClient
      .from(TABLE)
      .select("id, title, language, published, created_at")
      .eq("language", lang)
      .order("created_at", { ascending: false });

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5">Error: ${escapeHtml(error.message)}</td></tr>`;
      return;
    }

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5">No posts yet. Use the form above to create one.</td></tr>`;
      highlightEditingRow(null);
      return;
    }

    tbody.innerHTML = data
      .map(
        (row) => `
      <tr data-row-id="${row.id}">
        <td>${escapeHtml(row.title)}</td>
        <td>${escapeHtml(row.language)}</td>
        <td>${row.published ? "Yes" : "Draft"}</td>
        <td>${formatContentDate(row.created_at, "en")}</td>
        <td class="admin-table__actions">
          <button type="button" class="btn btn--outline btn--sm" data-edit-id="${row.id}">Edit</button>
          <button type="button" class="btn btn--danger btn--sm" data-delete-id="${row.id}">Delete</button>
        </td>
      </tr>`
      )
      .join("");

    if (editingId) highlightEditingRow(editingId);
  }

  async function loadForEdit(id) {
    const { data, error } = await supabaseClient.from(TABLE).select("*").eq("id", id).single();
    if (error) {
      setStatus(error.message, true);
      return;
    }

    editingId = id;
    const allImages = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
    coverUrl = allImages[0] || null;
    albumImages = allImages.slice(1);

    const form = formEl();
    if (!form) return;

    form.title.value = data.title || "";
    form.subtitle.value = data.subtitle || "";
    form.language.value = data.language || "mk";
    form.published.checked = !!data.published;
    if (form.event_date) form.event_date.value = data.event_date || "";
    if (form.location) form.location.value = data.location || "";
    if (form.year) form.year.value = data.year || "";

    setEditorHtml(quill, data.body || "");
    renderCoverPreview();
    renderAlbumPreview();
    setEditorModeUI(true, data.title || "");
    highlightEditingRow(id);
    setStatus("Make your changes, then click Save changes.", false);

    const filter = document.getElementById("admin-language-filter");
    if (filter && data.language) filter.value = data.language;

    document.getElementById("admin-form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set("edit", String(id));
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }

  async function deleteRow(id) {
    if (!confirm("Delete this item permanently?")) return;
    const { error } = await supabaseClient.from(TABLE).delete().eq("id", id);
    if (error) {
      setStatus(error.message, true);
      return;
    }
    if (Number(editingId) === Number(id)) resetForm();
    setStatus("Deleted.", false);
    const lang = document.getElementById("admin-language-filter")?.value || "mk";
    loadList(lang);
  }

  function resetForm() {
    editingId = null;
    coverUrl = null;
    albumImages = [];
    revokeCoverPreviewUrl();
    revokeAlbumPendingPreviews();
    const form = formEl();
    if (form) form.reset();
    setEditorHtml(quill, "");
    renderCoverPreview();
    renderAlbumPreview();
    setEditorModeUI(false);
    setStatus("", false);
    highlightEditingRow(null);

    const coverInput = document.getElementById("admin-cover-file");
    const albumInput = document.getElementById("admin-album-files");
    if (coverInput) coverInput.value = "";
    if (albumInput) albumInput.value = "";

    if (window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }

  function markActiveNav() {
    const page = location.pathname.split("/").pop();
    document.querySelectorAll(".admin-header__nav a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      a.classList.toggle("admin-header__nav-link--active", href === page);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!TABLE || !BUCKET) return;

    await requireAdminSession();
    markActiveNav();

    const titleEl = document.getElementById("admin-page-title");
    if (titleEl) titleEl.textContent = PAGE_TITLE;

    setEditorModeUI(false);

    quill = initRichEditor("admin-editor", {
      bucket: "content-media",
      hiddenInput: "admin-body-html",
      placeholder: "Write article content…",
    });

    const filter = document.getElementById("admin-language-filter");
    if (filter) {
      filter.addEventListener("change", () => loadList(filter.value));
      loadList(filter.value || "mk");
    }

    document.getElementById("admin-cover-file")?.addEventListener("change", renderCoverPreview);
    document.getElementById("admin-album-files")?.addEventListener("change", refreshAlbumPendingPreviews);

    formEl()?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userId = await getCurrentUserId();
      if (!userId) return;

      const form = e.target;
      const fd = new FormData(form);
      const bodyHtml = getEditorHtml(quill);
      if (!fd.get("title")?.toString().trim()) {
        setStatus("Title is required.", true);
        return;
      }
      if (!bodyHtml || bodyHtml === "<p><br></p>") {
        setStatus("Content body is required.", true);
        return;
      }

      setStatus(editingId ? "Saving changes…" : "Creating…", false);
      if (submitBtnEl()) submitBtnEl().disabled = true;

      try {
        let finalCover = coverUrl;
        const coverFile = document.getElementById("admin-cover-file")?.files?.[0];
        if (coverFile) {
          const [uploadedCover] = await uploadGalleryFiles([coverFile]);
          finalCover = uploadedCover;
        }

        const newAlbumUrls = await uploadGalleryFiles(document.getElementById("admin-album-files")?.files);
        const images = buildImagesPayload(finalCover, [...albumImages, ...newAlbumUrls]);

        const payload = {
          author_id: userId,
          language: fd.get("language"),
          title: fd.get("title"),
          subtitle: fd.get("subtitle") || null,
          body: bodyHtml,
          body_format: "html",
          images,
          published: fd.get("published") === "on",
        };

        if (form.event_date) payload.event_date = fd.get("event_date") || null;
        if (form.location) payload.location = fd.get("location") || null;
        if (form.year) payload.year = fd.get("year") ? Number(fd.get("year")) : null;

        let error;
        if (editingId) {
          ({ error } = await supabaseClient.from(TABLE).update(payload).eq("id", editingId));
        } else {
          ({ error } = await supabaseClient.from(TABLE).insert(payload));
        }

        if (error) throw error;

        const lang = payload.language;
        const wasEditing = !!editingId;
        resetForm();
        await loadList(lang);
        setStatus(wasEditing ? "Changes saved successfully." : "Content created successfully.", false);
      } catch (err) {
        setStatus(err.message || "Save failed", true);
      } finally {
        if (submitBtnEl()) submitBtnEl().disabled = false;
      }
    });

    resetBtnEl()?.addEventListener("click", resetForm);

    document.addEventListener("click", (ev) => {
      const editId = ev.target.getAttribute("data-edit-id");
      const deleteId = ev.target.getAttribute("data-delete-id");
      const removeAlbumIdx = ev.target.getAttribute("data-remove-album");

      if (editId) loadForEdit(Number(editId));
      if (deleteId) deleteRow(Number(deleteId));
      if (removeAlbumIdx !== null && removeAlbumIdx !== "") {
        albumImages.splice(Number(removeAlbumIdx), 1);
        renderAlbumPreview();
        setStatus("Album photo removed. Click Save changes to apply.", false);
      }
    });

    document.getElementById("admin-signout")?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await signOut();
      window.location.href = "login.html";
    });

    const editParam = new URLSearchParams(window.location.search).get("edit");
    if (editParam) loadForEdit(Number(editParam));
  });
})();
