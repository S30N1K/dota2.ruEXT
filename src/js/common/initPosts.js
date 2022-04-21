import {socket, socketConnect} from "../socket";
import {config} from "../config";
import {getSmiles} from "../api";

export const initPosts = async (selector) => {
    const users = []
    for (const post of selector) {

        const a = $(post).find("a")
        const b = a.attr("href").split("/")[1].split(".")
        const userId = parseInt(b[1])
        const login = b[0]
        const nick = a.html().trim()

        users.push({userId, login, nick})
    }

    socketConnect(async () => {
        socket.emit("getUsers", users)
        socket.on("users", async e => {

            for (const user of e) {
                const u = $(`.user-block-${user.userId}`).parent().find(".forum-theme__item-left")

                if (config.showColors && user.color) {

                    u.css("box-shadow", `${user.color} 0px 0px 4px 4px`)
                }

                if (config.showTopSmiles && user.smiles) {
                    const smileUrl = user.smiles.src ? user.smiles.src : "/img/forum/emoticons/" + (await getSmiles()).all.find(e => e.id === user.smiles.smileId.toString()).filename
                    const userInfo = u.find(".forum-theme__item-info-desk")
                    userInfo.append(`
                            <p class="forum-theme__item-info" style="height: 30px !important;">
                            <img src="${smileUrl}">
                            ${user.smiles.count}
                            </p>`)
                }
            }
        })
    })
}