import {config} from "../config";
import {waitInitSelector, $_} from "../utils";
import {uploadToImgBB} from "../api";


const types = ["image/gif", "image/jpg", "image/png"]
const $info = $_("div")
    .css({
        background: "black",
        position: "absolute",
        width: "100%",
        height: "100%",
        zIndex: 3,
        opacity: .8,
        color: "darkgray",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    })

const uploadImage = async (files) => {


    $info.html("Пожалуйста подождите, идет загрузка изображения на imgbb").fadeIn(300)
    for (let i = 0; i < files.length; i++) {
        $info.html(`Пожалуйста подождите, идет загрузка изображения на imgbb ${i + 1} из ${files.length}`)

        const file = files[i]

        if (types.includes(file.type)) {
            const uploadRes = await uploadToImgBB(file)
            switch (uploadRes.status) {
                case 200: {
                    window.tinymce.activeEditor.insertContent(`<img src="${uploadRes.data.url}"/>`)
                    break
                }
                default: {
                    Utils.notify("Произошла ошибка. Проверь токен imgbb в настройках сайта")
                    break
                }
            }
        } else {
            Utils.notify(`Не известный тип ${file.type}`)
        }
    }
    $info.fadeOut()
}


export const uploadImages = async () => {
    if (!config.uploadImages || !config.uploadImagesToken) {
        return
    }
    const selector = $(!window.location.pathname.match(/conversation/) ? "#forumPost_ifr" : "#conversationPost_ifr")

    $(selector[0].contentWindow.document.body)
        .on("paste", async (e) => {
            console.log(11)
            if (e.originalEvent.clipboardData.types.includes("Files")) {
                const file = e.originalEvent.clipboardData.files[0]
                //await uploadImage([file])
            }

        })

    waitInitSelector(selector, 100, async t => {
        const $container = $(t).closest(".tox-editor-container")
        $container.append($info)
        $info.fadeOut(0)


        const wait = async (socket, event, data, cb) => {
            return new Promise(resolve => {
                socket.on(event, async (res) => {
                    await cb(res)
                    resolve()
                })

                socket.emit(event, data)
            })
        }

        // $("button#send-message").on("click", async (e) => {
        //
        //
        //
        //     // console.log(tinymce.activeEditor.getContent())
        //
        //     let str = tinymce.activeEditor.getContent()
        //
        //     async function replaceAsync(str, regex, asyncFn) {
        //         const promises = [];
        //         str.replace(regex, (match, ...args) => {
        //             const promise = asyncFn(match, ...args);
        //             promises.push(promise);
        //         });
        //         const data = await Promise.all(promises);
        //         return str.replace(regex, () => data.shift());
        //     }
        //
        //     socketConnect(async (socket) => {
        //
        //         $info.html("Обработка ссылок").fadeIn(300)
        //
        //         const pp = await replaceAsync(str, /<a href="(.*)">(.*)<\/a>/gm, async (original, url, name) => {
        //
        //             let result
        //             await wait(socket, "screenUrl", url, async (res) => {
        //
        //                 res.res = "data:image/png;base64," + res.res
        //
        //                 const a = await fetch(res.res)
        //                 const b = await a.blob()
        //                 const file = new File([b], "File.png", {type: "image/png"})
        //
        //                 $info.html("Загрузка на imgbb").fadeIn(300)
        //                 const uploadRes = await uploadToImgBB(file)
        //
        //                 if (uploadRes.status === 200){
        //                     result = original + "<br>3" + `<img src="${uploadRes.data.url}"/>`
        //                 }
        //
        //
        //             })
        //
        //             return result
        //         })
        //
        //         tinymce.activeEditor.setContent(pp)
        //
        //         $info.fadeOut()
        //     })
        //
        //
        //
        //
        //     e.preventDefault()
        // })

        // Выгрузка изображений
        // tinymce.contentWindow.document.body.addEventListener("paste", async (e) => {
        //     console.log(e)
        // })

        $(t.contentWindow.document.body)
            .on("paste", async (e) => {
                if (e.originalEvent.clipboardData.types.includes("Files")) {
                    const file = e.originalEvent.clipboardData.files[0]
                    await uploadImage([file])
                }

            })

            .on("dragenter", () => {
                console.log("enter")
                $info.html("Перетащите изображения сюда").fadeIn(300)
            })

        $info
            .on("mouseleave", () => {
                // $info.fadeOut(300)
            })
            .on("dragleave", () => {
                $info.fadeOut(300)
            })
            .on("dragover", (e) => {
                console.log("over")
                e.preventDefault()
            })
            .on("drop", async (e) => {
                e.stopPropagation()
                e.preventDefault()
                await uploadImage(e.originalEvent.dataTransfer.files)
                $info.fadeOut(300)
            })

    })

}