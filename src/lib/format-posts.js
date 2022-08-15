const { DateTime } = require('luxon')
const slugify = require('slugify')

function formatPosts(posts) {
    const toSlug = string =>
        slugify(string, {
            lower: true,
            strict: true,
        })

    return posts.map(post => {
        const date = post.date_finished
        const dateSlug = DateTime.fromISO(date).toFormat('yyyy/LL/dd')

        if (post.show) {
            const seasonEpisode =
                post.show.episode &&
                post.show.season &&
                `-s${toSlug(post.show.season.toString())}e${toSlug(
                    post.show.episode.toString()
                )}`

            const url = `/show/${dateSlug}/${toSlug(
                post.show.show.title
            )}${seasonEpisode}.html`

            return {
                ...post,
                ...post.show,
                ...post.show.show,
                media: 'TV Show',
                date,
                url,
            }
        }
        if (post.movie) {
            const url = `/movie/${dateSlug}/${toSlug(post.movie.title)}.html`

            return {
                ...post,
                ...post.movie,
                creator: post.movie.director,
                date,
                media: 'Movie',
                url,
            }
        }
        if (post.book) {
            const url = `/book/${dateSlug}/${toSlug(post.book.title)}.html`

            return {
                ...post,
                ...post.book,
                creator: post.book.author,
                date,
                media: 'Book',
                url,
            }
        }

        return post
    })
}

module.exports = formatPosts
