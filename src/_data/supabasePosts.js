const formatPosts = require('../lib/format-posts')
const supabase = require('../lib/supabase')

async function query(page = 0, size = 1000) {
    const begin = page * size
    const end = begin + size - 1

    const { data, error, count } = await supabase
        .from('entries')
        .select('*, movie(*), show(*, show(*)), book(*)', { count: 'exact' })
        .order('date_finished')
        .not('date_finished', 'is', null)
        .range(begin, end)

    if (error) {
        throw error
    }

    let moreData = []
    if (count > end) {
        moreData = await query(page + 1, size)
    }

    return [...data, ...moreData]
}

module.exports = async function () {
    const posts = await query()

    return formatPosts(posts)
}
