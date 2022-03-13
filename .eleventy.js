const { DateTime } = require('luxon')
const fs = require('fs')
const htmlmin = require('html-minifier')
const pluginNavigation = require('@11ty/eleventy-navigation')
const pluginRss = require('@11ty/eleventy-plugin-rss')

module.exports = function (eleventyConfig) {
    // Add plugins
    eleventyConfig.addPlugin(pluginNavigation)
    eleventyConfig.addPlugin(pluginRss)

    // For debugging
    eleventyConfig.addFilter('log', value => {
        console.log(value)
    })

    // Test if a Nunjucks variable is an array
    eleventyConfig.addFilter('isArray', arr => Array.isArray(arr))

    // Various date formats
    const getYearMonth = date =>
        DateTime.fromJSDate(date, { zone: 'utc' }).toFormat('yyyy-LL')

    const getReadableDate = date =>
        DateTime.fromJSDate(date, { zone: 'utc' }).toFormat('dd LLLL yyyy')

    eleventyConfig.addFilter('yearAndMonth', getYearMonth)

    eleventyConfig.addFilter('yearOnly', dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('yyyy')
    })

    eleventyConfig.addFilter('dayOnly', dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('dd')
    })

    eleventyConfig.addFilter('readableDate', getReadableDate)

    eleventyConfig.addFilter('readableYearAndMonth', dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat(
            'LLLL yyyy'
        )
    })

    // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
    eleventyConfig.addFilter('htmlDateString', dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat(
            'yyyy-LL-dd'
        )
    })

    // Retrieve previous views/reads
    eleventyConfig.addShortcode('getPreviousViews', (slug, posts) => {
        const {
            data: { creator, date, episode, media, season, title, year },
        } = posts.find(p => p.fileSlug === slug)

        const filteredPosts = posts.filter(
            ({ data }) =>
                data.title === title &&
                data.creator === creator &&
                data.year === year &&
                data.media === media &&
                data.date !== date &&
                (media !== 'TV Show' ||
                    (media === 'TV Show' &&
                        data.season === season &&
                        data.episode === episode))
        )

        let html = ''

        if (filteredPosts.length > 0) {
            html = '<dt>Other visits</dt><div>'
            filteredPosts.forEach(p => {
                const date = getReadableDate(p.date)
                html += `<dd><a href="${p.url}">${date}</a></dd>`
            })
            html += '</div>'
        }

        return html
    })

    // Break up posts by month and year for frontend styling
    eleventyConfig.addCollection('postsByMonth', collection => {
        const posts = collection.getFilteredByTag('posts').reverse()
        const months = posts.map(post => getYearMonth(post.date))
        const uniqueMonths = [...new Set(months)]

        const postsByMonth = uniqueMonths.reduce((prev, month) => {
            // If the posts match the current month and if they have a completion date
            // (i.e., don't show in-progress books)
            const filteredPosts = posts.filter(
                post => getYearMonth(post.date) === month && post.data.date
            )

            return [...prev, filteredPosts]
        }, [])

        return postsByMonth
    })

    // Minify HTML
    eleventyConfig.addTransform('htmlmin', (content, outputPath) => {
        if (outputPath && outputPath.endsWith('.html')) {
            const minified = htmlmin.minify(content, {
                useShortDoctype: true,
                removeComments: true,
                collapseWhitespace: true,
            })
            return minified
        }

        return content
    })

    // Copy favicons to base dir
    eleventyConfig.addPassthroughCopy({ 'src/assets/favicon': '/' })

    // Override Browsersync defaults (used only with --serve)
    eleventyConfig.setBrowserSyncConfig({
        callbacks: {
            ready: (err, browserSync) => {
                const content_404 = fs.readFileSync('_site/404.html')

                browserSync.addMiddleware('*', (req, res) => {
                    // Provides the 404 content without redirect.
                    res.writeHead(404, {
                        'Content-Type': 'text/html; charset=UTF-8',
                    })
                    res.write(content_404)
                    res.end()
                })
            },
        },
        files: './_site/css/**/*.css',
        ghostMode: false,
        ui: false,
    })

    return {
        templateFormats: ['md', 'njk', 'html'],
        markdownTemplateEngine: 'liquid',
        htmlTemplateEngine: 'njk',
        dir: {
            input: 'src',
            output: '_site',
        },
    }
}
