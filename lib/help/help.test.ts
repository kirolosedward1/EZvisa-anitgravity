import assert from "node:assert/strict"
import { test } from "node:test"
import { HELP_ARTICLES, HELP_TOPICS, helpArticle, helpArticleHref, topicArticles } from "./articles.ts"
import { normalizeHelpText, searchHelp, type HelpSearchItem } from "./search.ts"
import { PRICE_AED, priceAed } from "../shared/wizard-contract.ts"

const items = (lang: "en" | "ar"): HelpSearchItem[] =>
  HELP_ARTICLES.map((article) => ({
    href: helpArticleHref(article),
    title: article.title[lang],
    summary: article.summary[lang],
    topic: HELP_TOPICS.find((topic) => topic.slug === article.topic)!.title[lang],
    text: article.body[lang].join(" "),
  }))

test("every article belongs to a topic, has a unique path, and both languages", () => {
  const topics = new Set(HELP_TOPICS.map((topic) => topic.slug))
  const paths = new Set<string>()
  for (const article of HELP_ARTICLES) {
    assert.ok(topics.has(article.topic), `${article.slug} has an unknown topic`)
    const href = helpArticleHref(article)
    assert.ok(!paths.has(href), `${href} is duplicated`)
    paths.add(href)
    for (const lang of ["en", "ar"] as const) {
      assert.ok(article.title[lang] && article.summary[lang], `${href} is missing ${lang} text`)
      assert.ok(article.body[lang].length > 0, `${href} has no ${lang} body`)
    }
    assert.equal(article.body.en.length, article.body.ar.length, `${href}: English and Arabic paragraphs differ`)
  }
  for (const topic of HELP_TOPICS) assert.ok(topicArticles(topic.slug).length > 0, `${topic.slug} is empty`)
})

test("internal links in article bodies point at pages or articles that exist", () => {
  for (const article of HELP_ARTICLES) {
    for (const paragraph of [...article.body.en, ...article.body.ar]) {
      for (const [, href] of paragraph.matchAll(/\]\((\/[^)]*)\)/g)) {
        const help = href.match(/^\/help\/([^/]+)\/([^/]+)$/)
        if (help) assert.ok(helpArticle(help[1], help[2]), `${helpArticleHref(article)} links to missing ${href}`)
        else assert.ok(!href.startsWith("/ar"), `${href} should be locale-free`)
      }
    }
  }
})

test("prices come from the shared contract", () => {
  const cost = helpArticle("pricing-and-payment", "what-it-costs")!
  assert.ok(cost.summary.en.includes(String(PRICE_AED)))
  assert.ok(cost.summary.en.includes(String(priceAed("yes"))))
})

test("Arabic normalisation folds alef forms, taa marbuta, diacritics and digits", () => {
  assert.equal(normalizeHelpText("إسترداد"), normalizeHelpText("استرداد"))
  assert.equal(normalizeHelpText("التأشيرة"), normalizeHelpText("التاشيره"))
  assert.equal(normalizeHelpText("٢٤٩"), "249")
  assert.equal(normalizeHelpText("See [the policy](/refund-policy)."), "see the policy")
})

test("search finds articles by words in either language and ranks title matches first", () => {
  assert.equal(searchHelp(items("en"), "refund")[0].href, "/help/refunds-and-cancellations/when-is-the-fee-refunded")
  assert.ok(searchHelp(items("en"), "whatsapp documents").some((hit) => hit.href.endsWith("/send-documents-on-whatsapp")))
  assert.ok(searchHelp(items("ar"), "التأمين").some((hit) => hit.href.startsWith("/help/travel-insurance/")))
  assert.ok(searchHelp(items("ar"), "استرداد").length > 0)
  assert.deepEqual(searchHelp(items("en"), ""), [])
  assert.deepEqual(searchHelp(items("en"), "zzzz"), [])
})
