const setToStorage = (key, data) => {
  const obj = {}
  obj[key] = data
  chrome.storage.sync.set(obj)
}

const getFromStorage = async (key) => {
  const sres = await chrome.storage.sync.get(key)
  return sres[key]
}

const injectUnAuthUI = async () => {
  let pMessage = '',
    sMessage = ''

  pMessage = 'Please login and pass Cloudflare check at'
  sMessage = 'OpenAI requires passing a security check every once in a while.'

  let aHref = 'https://chat.openai.com'

  const messageMarkup = `
        <div class="first-row">
            <p class="p-message">${pMessage}</p>
            <a href=${aHref} target="_blank" class="ahref">chat.openai.com</a>
        </div>
    `

  let complexUI = document.querySelector('.TQc1id.rhstc4')
  let simpleUI = document.querySelector('.GyAeWb')

  let sidePanel = complexUI || simpleUI

  let chatContainer = document.createElement('div')
  chatContainer.setAttribute('class', 'chat-cont')

  chatContainer.innerHTML = messageMarkup
  if (complexUI) {
    sidePanel.prepend(chatContainer)
  } else if (simpleUI) {
    sidePanel.appendChild(chatContainer)
  }
  let el = chatContainer.nextSibling
  if (el) {
    chatContainer.classList.add('designForChatCont')
  }
}

const getOrCreateChatContainer = async () => {
  let complexUI = document.querySelector('.TQc1id.rhstc4')
  let simpleUI = document.querySelector('.GyAeWb')

  let sidePanel = complexUI || simpleUI

  let chatContainer = sidePanel.querySelector('#chat-contain')
  if (!chatContainer) {
    chatContainer = document.createElement('div')

    chatContainer.setAttribute('class', 'chat-cont')
    chatContainer.setAttribute('id', 'chat-contain')

    if (complexUI) {
      sidePanel.prepend(chatContainer)
    } else if (simpleUI) {
      sidePanel.appendChild(chatContainer)
    }
  }

  return chatContainer
}

let loading = false

const injectAnswerUI = async () => {
  let tempMsg = loading ? 'Loading response from ChatGPT...' : ''

  document.getElementById('type-text')?.remove()

  const messageMarkup = document.createElement('p')
  messageMarkup.setAttribute('class', 'p-message')
  messageMarkup.setAttribute('id', 'type-text')
  messageMarkup.textContent = tempMsg

  const chatContainer = await getOrCreateChatContainer()
  let el = chatContainer.nextSibling
  if (el) {
    chatContainer.classList.add('designForChatCont')
  }
  chatContainer.appendChild(messageMarkup)

  return Promise.resolve()
}

const main = () => {
  chrome.runtime.sendMessage({ message: 'session-initial-check' })
}

main()

let STREAM = {
  text: '',
}

var streamProxy = new Proxy(STREAM, {
  set: function (target, key, value) {
    target[key] = value
    return true
  },
})

chrome.runtime.onMessage.addListener(async function (
  response,
  sender,
  sendResponse
) {
  const { message } = response
  if (message === 'answer') {
    const { answer } = response
    let container = document.getElementById('chat-contain')
    const markdown = window.markdownit()
    const html = markdown.render(answer)
    container.innerHTML = html
    hljs.highlightAll()

    let headingContain = document.createElement('div')
    headingContain.classList.add('headingCont')
    let h1 = document.createElement('h1')
    h1.classList.add('heading')
    h1.textContent = 'ChatGPT'
    let img = document.createElement('img')
    img.src = chrome.runtime.getURL('./icon32.png')
    img.classList.add('icon-design')

    // let buttonContainer = document.createElement('div')
    // buttonContainer.classList.add('buttonCont')
    let buttonEl = document.createElement('a')
    buttonEl.href =
      'https://chrome.google.com/webstore/detail/chatgpt-for-chrome/pjhdflpjemjalkidecigcjcamkbllhoj'
    buttonEl.target = '_blank'
    buttonEl.textContent = 'Rate Us'
    buttonEl.classList.add('button-align')
    // buttonContainer.appendChild(buttonEl)

    headingContain.appendChild(h1)
    headingContain.appendChild(img)
    headingContain.appendChild(buttonEl)

    container.prepend(headingContain)

    // code for adding the copybutton for the pre tags
    let preTagsList = document.querySelectorAll('pre')
    if (preTagsList.length > 0) {
      for (let tag of preTagsList) {
        let cont = document.createElement('div')
        cont.classList.add('copy-cont')
        let button = document.createElement('button')
        button.textContent = 'Copy code'
        button.classList.add('copy-button')
        let img = document.createElement('img')
        img.src = chrome.runtime.getURL('./one.svg')
        img.classList.add('copy-img')
        cont.appendChild(img)
        cont.appendChild(button)
        container.insertBefore(cont, tag)
        cont.addEventListener('click', () => {
          const textarea = document.createElement('textarea')
          textarea.value = tag.textContent
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
          button.textContent = 'Copied!!'
          img.src = chrome.runtime.getURL('./two.svg')
          setTimeout(() => {
            button.textContent = 'Copy code'
            img.src = chrome.runtime.getURL('./one.svg')
          }, 3000)
        })
      }
    }
  } else if (message === 'session-updated') {
    let at = await getFromStorage('accessToken')

    if (!at) {
      await injectUnAuthUI()
      return
    }

    let inputBar = document.querySelector('input.gLFyf')
    let sQuery = inputBar?.value || ''

    if (sQuery) {
      loading = true
      await injectAnswerUI()
      chrome.runtime.sendMessage({ message: 'search-occured', query: sQuery })
     
    }
  }
})

window.addEventListener(
  'focus',
  () => {
    chrome.runtime.sendMessage({ message: 'session-check' })
  },
  true
)

window.focus()

let theme = document.getElementsByClassName('UCGAnb')
console.log(theme)
