
(function() {
  const INSIGHTS_API_URL = "https://script.google.com/macros/s/AKfycbz7R0DuCxWOUw75o4i-EAvAi9ELV8vQHdfoGkJ4pFsjY8JC4XpWeaPfZf9bwpLKK1oT/exec";

  function buildApiUrl(action, params) {
    const url = new URL(INSIGHTS_API_URL);
    url.searchParams.set("action", action);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  async function callInsightsApi(action, params) {
    const response = await fetch(buildApiUrl(action, params), { cache: "no-store" });
    if (!response.ok) throw new Error("Insights API request failed.");
    return await response.json();
  }

  function normalizeList(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.articles)) return payload.articles;
    if (Array.isArray(payload.insights)) return payload.insights;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }

  function normalizeArticle(payload) {
    if (!payload) return null;
    if (payload.article) return payload.article;
    if (payload.insight) return payload.insight;
    if (payload.data && !Array.isArray(payload.data)) return payload.data;
    return payload;
  }


  function getSessionCache(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp) return null;
      const maxAgeMs = 30 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAgeMs) {
        sessionStorage.removeItem(key);
        return null;
      }
      return parsed.value;
    } catch (error) {
      return null;
    }
  }

  function setSessionCache(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), value }));
    } catch (error) {
      // Ignore storage limits/private browsing restrictions.
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function driveImageUrl(url) {
    if (!url) return "";
    const text = String(url).trim();
    const match = text.match(/\/d\/([^/]+)/) || text.match(/[?&]id=([^&]+)/);
    if (match && match[1]) return "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w1200";
    return text;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date)) return escapeHtml(value);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function getArticleUrl(article) {
    if (article.slug) return "article.html?slug=" + encodeURIComponent(article.slug);
    return "article.html?id=" + encodeURIComponent(article.articleId || article.articleID || "");
  }

  function articleCard(article) {
    const cover = driveImageUrl(article.coverImageLink || article.coverImage || article.coverImageURL || "");
    const title = article.title || "Untitled Insight";
    const category = article.category || article.contentType || "Insight";
    const summary = article.summary || "";
    return `
      <article class="article-card dynamic-article-card">
        <a href="${getArticleUrl(article)}" class="article-card-link" aria-label="Read ${escapeHtml(title)}">
          <div class="article-image dynamic-article-image" style="background-image:url('${cover ? cover.replace(/'/g, "%27") : "assets/images/cap-data.jpg"}')"></div>
          <div class="article-text">
            <p class="category">${escapeHtml(category)}</p>
            <h3>${escapeHtml(title)}</h3>
            ${summary ? `<p class="article-summary">${escapeHtml(summary)}</p>` : ""}
            <span class="read-article-link">Read Article</span>
          </div>
        </a>
      </article>`;
  }

  async function initHomeInsights() {
    const grid = document.getElementById("featuredInsightsGrid");
    if (!grid) return;
    try {
      const payload = await callInsightsApi("getFeaturedInsights");
      const articles = normalizeList(payload).slice(0, 3);
      if (!articles.length) {
        grid.innerHTML = `<article class="article-card"><div class="article-text"><p class="category">Insights</p><h3>Featured insights will be available soon.</h3></div></article>`;
        return;
      }
      grid.innerHTML = articles.map(articleCard).join("");
    } catch (error) {
      grid.innerHTML = `<article class="article-card"><div class="article-text"><p class="category">Insights</p><h3>Unable to load insights at this time.</h3><p class="article-summary">Please refresh the page or visit again later.</p></div></article>`;
    }
  }

  let allInsights = [];
  function populateFilters(articles) {
    const category = document.getElementById("insightsCategoryFilter");
    const type = document.getElementById("insightsTypeFilter");
    if (!category || !type) return;
    const categories = [...new Set(articles.map(a => a.category).filter(Boolean))].sort();
    const types = [...new Set(articles.map(a => a.contentType).filter(Boolean))].sort();
    category.innerHTML = '<option value="">All Categories</option>' + categories.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    type.innerHTML = '<option value="">All Content Types</option>' + types.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  }

  function renderInsightLibrary() {
    const grid = document.getElementById("allInsightsGrid");
    if (!grid) return;
    const search = (document.getElementById("insightsSearch")?.value || "").toLowerCase().trim();
    const category = document.getElementById("insightsCategoryFilter")?.value || "";
    const type = document.getElementById("insightsTypeFilter")?.value || "";
    const filtered = allInsights.filter(article => {
      const searchable = [article.title, article.summary, article.tags, article.category, article.contentType].join(" ").toLowerCase();
      return (!search || searchable.includes(search)) && (!category || article.category === category) && (!type || article.contentType === type);
    });
    if (!filtered.length) {
      grid.innerHTML = `<div class="insights-empty"><h3>No insights found.</h3><p>Try another search term or filter.</p></div>`;
      return;
    }
    grid.innerHTML = filtered.map(articleCard).join("");
  }

  async function initInsightsLibrary() {
    const grid = document.getElementById("allInsightsGrid");
    if (!grid) return;
    try {
      const payload = await callInsightsApi("getAllInsights");
      allInsights = normalizeList(payload);
      populateFilters(allInsights);
      renderInsightLibrary();
      ["insightsSearch", "insightsCategoryFilter", "insightsTypeFilter"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(id === "insightsSearch" ? "input" : "change", renderInsightLibrary);
      });
    } catch (error) {
      grid.innerHTML = `<div class="insights-empty"><h3>Unable to load insights.</h3><p>Please refresh the page or try again later.</p></div>`;
    }
  }

  function renderMarkdown(markdown) {
    if (!markdown) return "";
    let text = String(markdown).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = text.split("\n");
    let html = "";
    let inList = false;
    function closeList() { if (inList) { html += "</ul>"; inList = false; } }
    lines.forEach(raw => {
      const line = raw.trim();
      if (!line) { closeList(); return; }
      if (line === "---") { closeList(); html += "<hr>"; return; }
      if (/^###\s+/.test(line)) { closeList(); html += `<h3>${inlineMarkdown(line.replace(/^###\s+/, ""))}</h3>`; return; }
      if (/^##\s+/.test(line)) { closeList(); html += `<h2>${inlineMarkdown(line.replace(/^##\s+/, ""))}</h2>`; return; }
      if (/^#\s+/.test(line)) { closeList(); html += `<h1>${inlineMarkdown(line.replace(/^#\s+/, ""))}</h1>`; return; }
      if (/^[-•]\s+/.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${inlineMarkdown(line.replace(/^[-•]\s+/, ""))}</li>`;
        return;
      }
      closeList();
      html += `<p>${inlineMarkdown(line)}</p>`;
    });
    closeList();
    return html;
  }

  function inlineMarkdown(text) {
    let safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");
    return safe;
  }

  function getArticleContent(article) {
    const content = article.content || article.articleContent || article.body || article.markdown || article.markdownContent || article.text || article.articleBody || "";
    if (String(content).trim()) return content;
    return "Article content is currently unavailable. Please refresh the page.";
  }

  async function initArticleReader() {
    const reader = document.getElementById("articleReader");
    if (!reader) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    const articleId = params.get("id") || params.get("articleId");
    if (!slug && !articleId) {
      reader.innerHTML = `<div class="article-reader-card"><h1>Article not found.</h1><p>No article identifier was provided.</p><a class="btn primary" href="insights.html">Back to Insights</a></div>`;
      return;
    }
    try {
      const cacheKey = "innovph_insight_" + (slug ? "slug_" + slug : "id_" + articleId);
      let payload = getSessionCache(cacheKey);
      if (!payload) {
        payload = await callInsightsApi("getInsight", { slug, articleId });
        setSessionCache(cacheKey, payload);
      }
      const article = normalizeArticle(payload);
      if (!article || article.status === "NOT_FOUND") throw new Error("Article not found");
      const cover = driveImageUrl(article.coverImageLink || "");
      const tags = String(article.tags || "").split(",").map(t => t.trim()).filter(Boolean);
      const content = getArticleContent(article);
      document.title = `${article.title || "INNOVPH Article"} | INNOVPH Insights`;
      reader.innerHTML = `
        <article class="article-reader-card">
          ${cover ? `<div class="article-reader-cover" style="background-image:url('${cover.replace(/'/g, "%27")}')"></div>` : ""}
          <div class="article-reader-content">
            <div class="article-meta-row">
              <span>${escapeHtml(article.contentType || "Insight")}</span>
              <span>${escapeHtml(article.category || "")}</span>
              <span>${formatDate(article.publishDate)}</span>
            </div>
            <h1>${escapeHtml(article.title || "Untitled Insight")}</h1>
            ${article.author ? `<p class="article-author">By ${escapeHtml(article.author)}</p>` : ""}
            ${article.summary ? `<p class="article-reader-summary">${escapeHtml(article.summary)}</p>` : ""}
            <div class="article-body">${renderMarkdown(content)}</div>
            ${tags.length ? `<div class="article-tags">${tags.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>` : ""}
            <div class="article-reader-actions">
              <a href="insights.html" class="btn outline dark">Back to Insights</a>
            </div>
          </div>
        </article>`;
    } catch (error) {
      reader.innerHTML = `<div class="article-reader-card"><div class="article-reader-content"><h1>Article could not be loaded.</h1><p>Please check the link and try again.</p><a class="btn primary" href="insights.html">Back to Insights</a></div></div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    initHomeInsights();
    initInsightsLibrary();
    initArticleReader();
  });
})();
