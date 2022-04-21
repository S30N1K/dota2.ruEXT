import {config} from "./config";
import {getCurrentLogin, getCurrentUserId, parseUserId} from "./utils";
import {socket, socketConnect} from "./socket";

const headers = {"X-Requested-With": "XMLHttpRequest"}

export const req = async (url, data, notParse = false) => {
    return await fetch(url, {
        method: data ? "POST" : "GET",
        headers,
        body: data ? (notParse ? data : JSON.stringify(data)) : null
    })
}

// Получить список смайлов
export const getSmiles = async () => {
    // const cache = sessionStorage.getItem("smiles")
    // if (cache) {
    //     return JSON.parse(cache)
    // }

    const res = require("./../old.json")// await (await req("/replies/get_smiles")).json()
    if (res.status === "success") {
        const smiles = res.smiles.smiles
        const categories = res.smiles.categories
        const all = Object.values(smiles).flat()
        const r = {
            smiles, all, categories
        }

        sessionStorage.setItem("smiles", JSON.stringify(r))

        return r
    }
}

// Получить список смайлов bttv
export const getBttvSmiles = async (offset = 0) => {
    return await (await req(`https://api.betterttv.net/3/emotes/shared/top?offset=${offset}&limit=100`)).json()
}

// Поиск по смайлам
export const searchSmiles = async (query) => {
    return await (await req("/forum/api/forum/getSmiles_textarea", {query})).json()
}

// Поиск по смайлам bttv
export const searchSmilesBttv = async (query, offset = 0) => {
    return await (await (req(`https://api.betterttv.net/3/emotes/shared/search?query=${query}&offset=${offset}&limit=100`))).json()
}

// Получить список уведомлений
export const getNotifications = async (page = 1, name = "Все уведомления") => {
    return await (await req("/forum/api/notices/preload", {
        page,
        name
    })).json()
}

// Получить список всех диалогов
export const getConversations = async () => {
    const conversations = await (await req("/forum/conversations/")).text()
    let unread = 0
    const dialogs = []

    const list = $(conversations).find(".forum-section__list > li:not(.forum-section__item--first)")
    for (const e of list) {
        const avatar = e.querySelector("div.forum-section__col-1 > a > img").getAttribute("src")
        const dialog = e.querySelector("div.forum-section__col-2 > div.forum-section__title > a")
        const link = dialog.getAttribute("href")
        const id = link.split("/")[3]
        let name = dialog.querySelector("span:nth-child(2)")?.innerText
        let isNew = false
        if (!name) {
            name = dialog.querySelector("span").innerText
        } else {
            unread++
            isNew = true
        }
        const users = e.querySelector(".forum-section__name").innerHTML
        dialogs.push({
            avatar, name, users, isNew, link, id
        })
    }

    return {
        unread, dialogs
    }
}

// Получить последние сообщения из диалога
export const getConversation = async (id) => {
    const conversation = await (await req(`/forum/conversation/${id}/unread`)).text()
    console.log(`/forum/conversation/${id}/unread`)
    const list = $(conversation).find("#message-list > li")
    const messages = []
    for (const e of list) {
        const u = e.querySelector(".forum-theme__item-left-mob > a")
        const username = u.innerText.trim()
        const nick_color = u.getAttribute("style").replace("color:", "").replace(";", "")
        const avatar = e.querySelector(".forum-theme__item-left.theme-user-block > a > img").getAttribute("src")
        const message = e.querySelector("blockquote").innerHTML

        messages.push({username, nick_color, avatar, message})
    }

    return messages
}

// Написать ответ в диалог
export const sendToConversation = async (cid, content) => {
    return await (await req("/forum/api/message/sendToConversation", {
        cid, content
    })).json()
}

// Подписаться на пользователя
export const subscribeUser = async (uid) => {
    return await (await req("/forum/api/user/subscribe", {
        uid
    })).json()
}

// Написать сообщение на стене
export const makeWallPost = async (uid, content, replyTo = null) => {
    return await (await req("/forum/api/user/makeWallPost", {
        uid, content, replyTo
    })).json()
}

// Удалить сообщение на стене
export const removeWallPost = async (pid, comment = false) => {
    return await (await req("/forum/api/user/removeWallPost", {
        pid, comment
    })).json()
}

// Получить подпись пользователя
export const getUserSignature = async (user_id) => {
    return await (await req("/forum/api/user/getUserSignature"), {
        user_id
    })
}

// Проверка, игнорирует ли меня
export const isIgnoreMe = async (uid) => {
    return await makeWallPost(uid, "a".repeat(501))
}

// Добавить в игнор лист
export const ignore = async (uid) => {
    return await (await req("/forum/api/user/ignore", {
        uid
    })).json()
}

// Убрать из игнор листа
export const unignore = async uid => {
    return await (await req("/forum/api/user/unignore", {
        uid
    })).json()
}

// Загрузка игнорлиста
export const loadIngoreList = async (page = 1, users = [], pages = 0) => {

    const $res = $(await (await req(`/forum/settings/ignorelist/page-${page}`)).text())
    if (!pages) {
        pages = $res.find(".pagination").data("pages") || 1
    }
    const $list = $res.find(".member-list")
    for (const li of $list.find("li")) {
        users.push(parseInt(li.getAttribute("id").replace("user-", "")))
    }

    if (page < pages) {
        return loadIngoreList(page + 1, users, pages)
    } else {
        return users
    }
}

// Получить список подписчиков
export const getFollowers = async (userId, userLogin) => {

    let followersList = JSON.parse(sessionStorage.getItem("followers")) || [],
        pages,
        currentPage = 1

    const loadPage = async () => {
        const followers = $(await (await (req(`/forum/members/${userLogin}.${userId}/followers/page-${currentPage}`))).text())

        if (!pages) {
            pages = followers.find(".pagination").data("pages")
        }

        const users = followers.find(".member-list > li")
        for (const e of users) {
            followersList.push(parseUserId(e.querySelector("a").getAttribute("href")))
        }

        if (currentPage !== pages && pages) {
            currentPage++
            return await loadPage()
        } else {
            sessionStorage.setItem("followers", JSON.stringify(followersList))
            return followersList
        }
    }

    if (followersList.length) {
        return followersList
    } else {
        return await loadPage()
    }
}

export const changeOrder = async (order) => {
    return await req("/forum/api/feed/changeOrder", {
        order
    })
}

// Получить список разделов форума
export const getForumSections = async () => {
    const list = []
    const sections = await (await req("/forum/")).text()
    const $contentList = $(sections).find(".content-list > .node").find("li")
    for (const node of $contentList) {
        const $link = $(node).find("a")
        const name = $link.html().trim()
        const url = $link.attr("href")
        const id = parseInt(url.split("/")[1].split(".")[1])
        list.push({id, name, url})
    }
    return list
}

// Получить список последних\актуальных тем форума
export const getForumThemes = async (offset, order) => {
    return await (await req("/forum/api/feed/get", {
        offset, order
    })).json()
}

export const saveForumSections = async (ids) => {
    return await req("/forum/api/feed/saveSettings", {
        ids
    })
}

// Выгрузить картинку на imgbb
export const uploadToImgBB = async file => {
    const formData = new FormData
    formData.append("image", file)
    return await (await req(`https://api.imgbb.com/1/upload?key=${config.uploadImagesToken}`, formData, true)).json()
}

// Создать тему
export const createForumTopic = async (title, content, forum, pinned = false, poolData = {question: "", variants: [], multiple: false}, prefix = -1, subscribe = 1) => {
    return await ((await req("/forum/api/forum/createForumTopic", {
        title, content, forum, pinned, poolData, prefix, subscribe
    })).json())
}

export const uploadAvatar = async (file) => {
    const is_gif = file.name.split('.').pop() === "gif"
    const formData = new FormData
    formData.append("is_gif", is_gif ? 1 : 0)
    formData.append("image", file)
    return await (await req(`/forum/api/user/changeAvatar`, formData, true)).json()
}


export const removeAvatar = async is_gif => {
    return await req("/forum/api/user/removeAvatar", {
        is_gif
    })
}

// Обновить статус
export const changeStatus = async text => {
    return await req("/forum/api/user/changeStatus", {
        text
    })
}


export const getLikes = async () => {
    const $parse = $(await (await req(`https://dota2.ru/forum/members/${getCurrentLogin()}.${getCurrentUserId()}/likes/rated-stat/`)).text()).find("table > tbody tr")

    const smiles = (await getSmiles()).all

    const list = []
    for (const e of $parse) {
        const $image = $(e).find("td:nth-child(1) img")
        const src = $image.attr("src")
        const title = $image.attr("title")
        const count = parseInt($(e).find("td:nth-child(2)").html().trim())

        if (title !== "Like" && title !== "Dislike") {
            try {
                const smileId = parseInt(smiles.find(e => e.title === title).id)
                list.push({smileId, count})
            } catch (e) {
                list.push({src, count})
            }
        }

    }

    socketConnect((socket) => {
        socket.emit("updateLikes", list)
    })
}