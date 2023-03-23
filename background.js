const setToStorage = async (key, data) => {
  try {
    const obj = {}
    obj[key] = data
    await chrome.storage.sync.set(obj)
  } catch (err) {}
}

const getFromStorage = async (key) => {
  try {
    const sres = await chrome.storage.sync.get(key)
    return sres[key]
  } catch (err) {}
}

const fetchAPI = async (url, config) => {
  try {
    let response = await fetch(url, config)
    return response.json()
  } catch (err) {
    console.log(err)
    return Promise.reject(err)
  }
}

const uuidv4 = () => {
  return crypto.randomUUID()
}

var handleError = function (err) {
  console.log(err)
  return null
}

const getAccessToken = async () => {
  const url = 'https://chat.openai.com/api/auth/session'
  const config = {
    method: 'GET',
    withCredentials: true,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  }
  const response = await fetch(url, config).catch(handleError)
  if (!response.ok) {
    let text =
      'There is error in ChatGPT or check the ChatGPT is logged in or not'
  } else {
    return response.json()
  }
}

const getAllConversations = async (at) => {
  try {
    const url =
      'https://chat.openai.com/backend-api/conversations?offset=0&limit=20'

    const config = {
      method: 'GET',
      withCredentials: true,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${at}`,
      },
    }

    return await fetchAPI(url, config)
  } catch (e) {
    console.log(e)
  }
}

const createConversation = async (accessToken, query) => {
  try {
    const url = 'https://chat.openai.com/backend-api/conversation'

    const config = {
      method: 'POST',
      withCredentials: true,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'next',
        messages: [
          {
            id: uuidv4(),
            role: 'user',
            content: {
              content_type: 'text',
              parts: [query],
            },
          },
        ],
        model: 'text-davinci-002-render',
        parent_message_id: uuidv4(),
      }),
    }

    const response = await fetch(url, config)
    // if responseStatus more than 400 it will send the response in text format
    if (!response.ok) {
      let check = await response.text()
      return check
    } else {
      return response
    }
  } catch (e) {
    console.log(e)
  }
}

const transform = (s) => {
  let value = s.split('data: ')[1]

  if (IsJsonString(value)) {
    return JSON.parse(value)
  }

  return null
}

const IsJsonString = (str) => {
  try {
    if (typeof str !== 'string') return false

    var json = JSON.parse(str)
    return typeof json === 'object'
  } catch (e) {
    return false
  }
}

const main = async (query, tabId) => {
  let accessToken = await getFromStorage('accessToken')

  if (!accessToken) {
    return {}
  }

  let response = await createConversation(accessToken, query)
  if (typeof response === 'object') {
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader()
    let finalStr = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      // if (!value.includes('[DONE]')) break
      if (value.includes('data:')) {
        let parsedResponse = transform(value)

        if (
          parsedResponse &&
          typeof parsedResponse === 'object' &&
          !parsedResponse?.error
        ) {
          let answer = parsedResponse?.message?.content?.parts[0]

          chrome.tabs.sendMessage(tabId, { message: 'answer', answer })
        }
      }
    }
  } else {
    let answer = response.split(':')[1].replace('}', '')
    chrome.tabs.sendMessage(tabId, { message: 'answer', answer })
  }
}

const sessionCheckAndSet = async () => {
  let userObj = await getAccessToken()

  let accessToken = userObj ? userObj['accessToken'] : ''
  await setToStorage('accessToken', accessToken)
}
;(async () => {
  await sessionCheckAndSet()
})()

chrome.runtime.onMessage.addListener(async function (
  response,
  sender,
  sendResponse
) {
  const { message } = response
  const tabId = sender.tab.id

  if (message === 'search-occured') {
    const { query } = response

    await main(query, tabId)
  } else if (message === 'session-check') {
    await sessionCheckAndSet(tabId)
  } else if (message === 'session-initial-check') {
    await sessionCheckAndSet(tabId)
    chrome.tabs.sendMessage(tabId, { message: 'session-updated' })
  }
})

chrome.runtime.onInstalled.addListener(function (details) {
  const { reason } = details
  if (reason == 'install') {
    chrome.notifications.create('welcome', {
      type: 'basic',
      title: 'ChatGPT for Chrome™',
      message: 'Thank you for installing!',
    })
  }
  chrome.tabs.create({
    url: 'https://chatgptbygoogle.com/#how-it-works',
    active: true,
  })

  return false
})

chrome.runtime.setUninstallURL('https://chatgptbygoogle.com/feedback/')
