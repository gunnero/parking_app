import type { AppLanguage } from "../stores/languageStore";

export type TranslationParams = Readonly<Record<string, string | number>>;

/**
 * English UI copy is the stable source key. Values in this catalogue are
 * presentation-only: parking protocol tokens, zone codes, vehicle plates and
 * SMS payloads must always be passed as interpolation values and stay intact.
 */
export const MACEDONIAN_TRANSLATIONS: Readonly<Record<string, string>> = {
  // App, navigation, and settings.
  "Parking Bitola": "Паркинг Битола",
  "Parking": "Паркирање",
  "Back": "Назад",
  "Home": "Почетна",
  "Appearance": "Изглед",
  "Appearance & language": "Изглед и јазик",
  "Theme": "Тема",
  "Choose what feels most comfortable. Changes apply immediately.":
    "Изберете го изгледот што најмногу ви одговара. Промените се применуваат веднаш.",
  "Saved on this device": "Зачувано на овој уред",
  "Restoring preference": "Се вчитува поставката",
  "System": "Системски",
  "Light": "Светла",
  "Dark": "Темна",
  "Automatically match your device setting.":
    "Автоматски следи ја поставката на уредот.",
  "Automatically match your device setting. Currently {appearance}.":
    "Автоматски следи ја поставката на уредот. Моментално: {appearance}.",
  "Use the bright, warm appearance.": "Користи светол и топол изглед.",
  "Use the low-light appearance.": "Користи изглед за слаба осветленост.",
  "Currently {mode}.": "Моментално: {mode}.",
  "{label} appearance": "Изглед: {label}",
  "{appearance} appearance": "{appearance} изглед",
  "Selected": "Избрано",
  "Following your device": "Се следи поставката на уредот",
  "Following your device language": "Се следи јазикот на уредот",
  "{mode} is selected": "Избрана е {mode} тема",
  "{appearance} is selected": "Избрана е {appearance} тема",
  "{appearance} appearance selected.": "Избрана е {appearance} тема.",
  "Following device appearance. Your device is currently using {mode} mode.":
    "Се следи изгледот на уредот. Уредот моментално користи {mode} тема.",
  "{mode} appearance selected.": "Избрана е {mode} тема.",
  "Your device is currently using {mode} mode. Parking Bitola will update automatically when that changes.":
    "Уредот моментално користи {mode} тема. Паркинг Битола автоматски ќе се приспособи кога тоа ќе се промени.",
  "Parking Bitola will keep this appearance until you choose another option. No restart is needed.":
    "Паркинг Битола ќе го задржи овој изглед додека не изберете друга опција. Не е потребно рестартирање.",
  "Language": "Јазик",
  "App language": "Јазик на апликацијата",
  "Choose the language used throughout Parking Bitola.":
    "Изберете го јазикот што ќе се користи во Паркинг Битола.",
  "Device language": "Јазик на уредот",
  "Use your device language when it is supported.":
    "Користи го јазикот на уредот кога е поддржан.",
  "Automatically match your device language. Currently {language}.":
    "Автоматски следи го јазикот на уредот. Моментално: {language}.",
  "Macedonian": "Македонски",
  "English": "Англиски",
  "Use Macedonian throughout the app.":
    "Користи македонски јазик низ целата апликација.",
  "Use English throughout the app.":
    "Користи англиски јазик низ целата апликација.",
  "{label} language": "Јазик: {label}",
  "{language} language": "{language} јазик",
  "Following device language": "Се следи јазикот на уредот",
  "{language} is selected": "Избран е {language}",
  "{language} language selected.": "Избран е {language} јазик.",
  "Following device language. Your device is currently using {language}.":
    "Се следи јазикот на уредот. Уредот моментално користи {language}.",
  "Your device language is currently {language}.":
    "Јазикот на уредот моментално е {language}.",
  "Parking Bitola will use {language} until you choose another language.":
    "Паркинг Битола ќе користи {language} додека не изберете друг јазик.",
  "Your device language is currently {language}. Parking Bitola uses your current device language.":
    "Јазикот на уредот моментално е {language}. Паркинг Битола го користи тековниот јазик на уредот.",
  "Parking Bitola will keep this language until you choose another option. No restart is needed.":
    "Паркинг Битола ќе го задржи овој јазик додека не изберете друга опција. Не е потребно рестартирање.",
  "Getting parking ready": "Се подготвува апликацијата",
  "Restoring your vehicle, parking session, history, and reminder preference.":
    "Се вчитуваат возилото, паркинг-сесијата, историјата и поставката за потсетници.",
  "Loading": "Се вчитува",

  // Public pilot and development safeguards.
  "Demo by Kalveri — not an official parking service":
    "Демо од Калвери — не е официјална паркинг-услуга",
  "Test data only · No real SMS or parking activation":
    "Само тест-податоци · Без вистинска SMS-порака или активирање паркинг",
  "Temporary demo setting": "Привремена демо-поставка",
  "Temporary demo data · Resets when this page reloads.":
    "Привремени демо-податоци · Се ресетираат при повторно вчитување на страницата.",
  "Temporary demo history · Resets on reload":
    "Привремена демо-историја · Се ресетира при повторно вчитување",
  "Temporary demo history · Resets when this page reloads.":
    "Привремена демо-историја · Се ресетира при повторно вчитување на страницата.",
  "Temporary demo record · Resets when this page reloads.":
    "Привремен демо-запис · Се ресетира при повторно вчитување на страницата.",
  "Sample vehicle": "Демо-возило",
  "DEVELOPMENT MODE": "РАЗВОЕН РЕЖИМ",
  "Development mode": "Развоен режим",
  "SIMULATED SESSION": "СИМУЛИРАНА СЕСИЈА",
  "Simulation": "Симулација",
  "Simulated": "Симулирано",
  "Simulated zone": "Симулирана зона",
  "Synthetic development boundary for app testing.":
    "Синтетичка развојна граница за тестирање на апликацијата.",
  "Sample location": "Демо-локација",
  "Demo location — not your current GPS position.":
    "Демо-локација — не е тековна GPS-позиција.",
  "Simulation only · TEST zones never open or send a real SMS.":
    "Само симулација · TEST-зоните никогаш не отвораат ниту испраќаат вистинска SMS-порака.",
  "Generated for the simulated parking-session flow.":
    "Генерирано за симулираниот тек на паркинг-сесијата.",
  "TEST-A1 and TEST-A2 use synthetic development boundaries. They are not verified or official Bitola parking zones.":
    "TEST-A1 и TEST-A2 користат синтетички развојни граници. Тие не се потврдени ниту официјални паркинг-зони во Битола.",
  "This is a simulated development zone. No SMS will be opened or sent.":
    "Ова е симулирана развојна зона. Нема да се отвори ниту испрати SMS-порака.",
  "Development mode. {zone} is a simulated test zone. No SMS will be opened or sent.":
    "Развоен режим. {zone} е симулирана тест-зона. Нема да се отвори ниту испрати SMS-порака.",
  "Development mode. {zoneCode} is a simulated test zone. No SMS will be opened or sent.":
    "Развоен режим. {zoneCode} е симулирана тест-зона. Нема да се отвори ниту испрати SMS-порака.",
  "Development record. No real parking SMS was opened or sent.":
    "Развоен запис. Не е отворена ниту испратена вистинска SMS-порака за паркирање.",
  "Development Zone TEST-A1": "Развојна зона TEST-A1",
  "Development Zone TEST-A2": "Развојна зона TEST-A2",

  // Home and location.
  "Parking home": "Почетна страница за паркирање",
  "CURRENT PARKING ZONE": "ТЕКОВНА ПАРКИНГ-ЗОНА",
  "Current parking zone": "Тековна паркинг-зона",
  "Finding parking zone": "Се бара паркинг-зоната",
  "Finding your parking zone": "Се бара вашата паркинг-зона",
  "Find your parking zone": "Пронајдете ја вашата паркинг-зона",
  "Parking zone not identified": "Паркинг-зоната не е утврдена",
  "Outside parking zone": "Надвор од паркинг-зона",
  "Location access needed": "Потребен е пристап до локацијата",
  "Location access": "Пристап до локацијата",
  "Location access is off": "Пристапот до локацијата е исклучен",
  "Location unavailable": "Локацијата не е достапна",
  "Location is unavailable": "Локацијата не е достапна",
  "Location Services are off": "Услугите за локација се исклучени",
  "Getting a current foreground location. This can take a moment.":
    "Се добива тековната локација додека ја користите апликацијата. Ова може да потрае кратко.",
  "We know your location, but verified parking-zone mapping is not available here yet.":
    "Ја знаеме вашата локација, но потврдена мапа на паркинг-зони сè уште не е достапна тука.",
  "Allow foreground location in Settings so the app can identify your parking zone.":
    "Дозволете пристап до локацијата во Поставки за апликацијата да може да ја утврди паркинг-зоната.",
  "Check Location Services and try again when you are ready.":
    "Проверете ги Услугите за локација и обидете се повторно.",
  "Your foreground location is used only when you choose to identify a parking zone.":
    "Вашата локација се користи само кога ќе изберете да ја утврдите паркинг-зоната.",
  "Choose whether to share your foreground location so we can identify your parking zone.":
    "Изберете дали ќе ја споделите локацијата додека ја користите апликацијата за да ја утврдиме паркинг-зоната.",
  "Enable foreground location for Parking Bitola, then return and refresh your location.":
    "Дозволете пристап до локацијата за Паркинг Битола, потоа вратете се и освежете ја локацијата.",
  "Turn on Location Services to identify your parking zone.":
    "Вклучете ги Услугите за локација за да ја утврдите паркинг-зоната.",
  "Your current location could not be read. Check your signal and try again.":
    "Тековната локација не може да се прочита. Проверете го сигналот и обидете се повторно.",
  "Location is used to identify your parking zone. Permission is requested only after you continue.":
    "Локацијата се користи за утврдување на паркинг-зоната. Дозвола се бара само откако ќе продолжите.",
  "Use my location": "Користи ја мојата локација",
  "Refresh location": "Освежи ја локацијата",
  "Try again": "Обиди се повторно",
  "Open Settings": "Отвори Поставки",
  "Open settings": "Отвори поставки",
  "Not checked": "Не е проверено",
  "Use your location when you are ready.":
    "Користете ја локацијата кога ќе бидете подготвени.",
  "Requesting access": "Се бара пристап",
  "Choose whether to share your foreground location.":
    "Изберете дали ќе ја споделите локацијата додека ја користите апликацијата.",
  "Location access off": "Пристапот до локацијата е исклучен",
  "Open Settings to allow foreground location.":
    "Отворете Поставки за да дозволите пристап до локацијата.",
  "Finding location": "Се бара локацијата",
  "This can take a moment outdoors or near a window.":
    "Ова може да потрае кратко, особено на отворено или близу прозорец.",
  "GPS unavailable": "GPS не е достапен",
  "Turn on Location Services, then try again.":
    "Вклучете ги Услугите за локација, потоа обидете се повторно.",
  "We could not get a current location. Try again.":
    "Не можевме да ја добиеме тековната локација. Обидете се повторно.",
  "GPS ready": "GPS е подготвен",
  "Current location is available.": "Тековната локација е достапна.",
  "Accurate to about {accuracy} m.": "Прецизност околу {accuracy} m.",
  "About {accuracy} m accuracy": "Прецизност околу {accuracy} m",
  "GPS status. {value}. {detail}": "GPS-статус. {value}. {detail}",
  "GPS detail": "GPS-детали",
  "Requests foreground permission if needed and reads the current GPS position":
    "По потреба бара дозвола за локацијата и ја чита тековната GPS-позиција",
  "Requesting permission": "Се бара дозвола",

  // Vehicle profile.
  "Current vehicle": "Тековно возило",
  "Current vehicle {plate}{nickname}. Default vehicle.":
    "Тековно возило {plate}{nickname}. Стандардно возило.",
  "No default vehicle selected.": "Нема избрано стандардно возило.",
  "Loading current vehicle.": "Се вчитува тековното возило.",
  "No vehicle selected": "Нема избрано возило",
  "Loading vehicle…": "Се вчитува возилото…",
  "Reading saved vehicle data.": "Се читаат зачуваните податоци за возилото.",
  "Ready for parking": "Подготвено за паркирање",
  "Add a vehicle to continue.": "Додајте возило за да продолжите.",
  "DEFAULT": "СТАНДАРДНО",
  "Default": "Стандардно",
  "Manage vehicles": "Управувај со возила",
  "Opens the local vehicle list": "Го отвора локалниот список на возила",
  "Your vehicles": "Вашите возила",
  "Keep the plate you park most often ready to use.":
    "Чувајте ја при рака табличката на возилото што најчесто го паркирате.",
  "Editing": "Уредување",
  "Vehicle registration plate": "Регистарска табличка",
  "Plate": "Табличка",
  "Nickname": "Прекар",
  "Vehicle nickname": "Прекар на возилото",
  "Family car": "Семејно возило",
  "Save changes": "Зачувај ги промените",
  "Add vehicle": "Додај возило",
  "Add a vehicle": "Додај возило",
  "Edit vehicle": "Уреди возило",
  "Saved vehicles": "Зачувани возила",
  "Loading saved vehicles…": "Се вчитуваат зачуваните возила…",
  "Registration plate": "Регистарска табличка",
  "(optional)": "(незадолжително)",
  "No nickname": "Без прекар",
  "Spaces and hyphens are removed when you save.":
    "Празните места и цртичките се отстрануваат при зачувување.",
  "Stored privately on this device.": "Приватно зачувано на овој уред.",
  "Cancel": "Откажи",
  "{count} vehicle": "{count} возило",
  "{count} vehicles": "{count} возила",
  "No vehicles saved": "Нема зачувани возила",
  "Add a registration plate above. Your first vehicle becomes the default.":
    "Додајте регистарска табличка погоре. Првото возило ќе стане стандардно.",
  "Set default": "Постави како стандардно",
  "Set {plate} as default vehicle":
    "Постави го {plate} како стандардно возило",
  "Edit": "Уреди",
  "Edit {plate}": "Уреди го {plate}",
  "Delete": "Избриши",
  "Delete {plate}": "Избриши го {plate}",
  "{plate} will be removed from this device.":
    "{plate} ќе биде отстрането од овој уред.",
  "Delete vehicle?": "Да се избрише возилото?",
  "Delete {plate} from your saved vehicles?":
    "Да се избрише {plate} од зачуваните возила?",
  "Loading your saved vehicle…": "Се вчитува зачуваното возило…",
  "Add or select a default vehicle before parking.":
    "Додајте или изберете стандардно возило пред да паркирате.",

  // Main actions and status.
  "START PARKING": "ЗАПОЧНИ ПАРКИРАЊЕ",
  "Start parking": "Започни паркирање",
  "Prepares a simulated parking session for the detected development zone":
    "Подготвува симулирана паркинг-сесија за утврдената развојна зона",
  "Parking cannot start until a supported zone is identified.":
    "Паркирањето не може да започне додека не се утврди поддржана зона.",
  "Use your location to identify a supported parking zone.":
    "Користете ја локацијата за да утврдите поддржана паркинг-зона.",
  "The parking request preview is unavailable.":
    "Прегледот на барањето за паркирање не е достапен.",
  "Checking": "Се проверува",
  "Checking preference": "Се проверува поставката",
  "On": "Вклучено",
  "Off": "Исклучено",
  "On for sessions": "Вклучено за сесии",
  "Parking reminder": "Потсетник за паркирање",
  "Parking reminder. {value}. {detail}":
    "Потсетник за паркирање. {value}. {detail}",
  "Enabled for active parking sessions.":
    "Вклучено за активни паркинг-сесии.",
  "Disabled in reminder settings.":
    "Исклучено во поставките за потсетници.",
  "Reading your saved preference.": "Се чита зачуваната поставка.",
  "Details": "Детали",
  "Show parking details": "Прикажи детали за паркирањето",
  "Hide parking details": "Скриј ги деталите за паркирањето",
  "Shows GPS, reminder and development information":
    "Прикажува информации за GPS, потсетникот и развојниот режим",
  "GPS, reminder and development information":
    "Информации за GPS, потсетникот и развојниот режим",
  "SMS preview": "Преглед на SMS-порака",

  // Parking session lifecycle.
  "Parking session": "Паркинг-сесија",
  "Completed parking session": "Завршена паркинг-сесија",
  "Zone": "Зона",
  "Vehicle": "Возило",
  "Operator": "Оператор",
  "SMS recipient": "SMS-примач",
  "SMS message": "SMS-порака",
  "PARKING ACTIVE": "ПАРКИРАЊЕТО Е АКТИВНО",
  "Parking active": "Паркирањето е активно",
  "Elapsed time {elapsed}": "Изминато време {elapsed}",
  "Elapsed time": "Изминато време",
  "OFF": "ИСКЛУЧЕНО",
  "ON": "ВКЛУЧЕНО",
  "UNAVAILABLE": "НЕДОСТАПНО",
  "SENT": "ИСПРАТЕНО",
  "CHECKING": "СЕ ПРОВЕРУВА",
  "PAUSED": "ПАУЗИРАНО",
  "ERROR": "ГРЕШКА",
  "PREPARING": "СЕ ПОДГОТВУВА",
  "Prepare parking request": "Подгответе барање за паркирање",
  "Preparing parking request": "Се подготвува барањето за паркирање",
  "Open SMS composer": "Отвори прозорец за SMS-порака",
  "Open the native SMS composer to prepare the parking request. Returning to the app does not confirm operator acceptance.":
    "Отворете го системскиот прозорец за SMS-порака за да го подготвите барањето. Враќањето во апликацијата не потврдува дека операторот го прифатил барањето.",
  "Continue": "Продолжи",
  "Parking SMS prepared": "SMS-пораката за паркирање е подготвена",
  "Waiting for confirmation": "Се чека потврда",
  "Closing the SMS composer alone does not confirm that the operator accepted the request.":
    "Самото затворање на прозорецот за SMS-порака не потврдува дека операторот го прифатил барањето.",
  "The parking SMS is prepared, but parking is not active yet. Confirm only after you receive an activation response from ЈП Паркинзи.":
    "SMS-пораката за паркирање е подготвена, но паркирањето сè уште не е активно. Потврдете само откако ќе добиете одговор за активирање од ЈП Паркинзи.",
  "Try start request again": "Обидете се повторно да започнете",
  "Prepare simulated request": "Подготви симулирано барање",
  "Prepare this development simulation. Nothing will be sent.":
    "Подгответе ја оваа развојна симулација. Ништо нема да се испрати.",
  "Simulated request": "Симулирано барање",
  "Simulated request prepared": "Симулираното барање е подготвено",
  "The simulated request is prepared. Confirm it manually to activate this development session.":
    "Симулираното барање е подготвено. Потврдете го рачно за да ја активирате оваа развојна сесија.",
  "Confirm simulated start": "Потврди симулирано започнување",
  "Simulated test session. {zoneCode} is not an official Bitola parking zone, and no SMS was opened or sent.":
    "Симулирана тест-сесија. {zoneCode} не е официјална паркинг-зона во Битола и не е отворена ниту испратена SMS-порака.",
  "{zoneCode} uses synthetic test data. It is not an official Bitola parking zone, and no SMS will be opened or sent.":
    "{zoneCode} користи синтетички тест-податоци. Не е официјална паркинг-зона во Битола и нема да се отвори ниту испрати SMS-порака.",
  "CONFIRMATION NEEDED": "ПОТРЕБНА Е ПОТВРДА",
  "Confirm parking started": "Потврдете дека паркирањето започна",
  "I sent the SMS": "Ја испратив SMS-пораката",
  "I did not send it": "Не ја испратив",
  "Stop parking": "Заврши паркирање",
  "Prepares a stop request using the saved parking session. GPS is not required.":
    "Подготвува барање за завршување со зачуваната паркинг-сесија. GPS не е потребен.",
  "PREPARING STOP": "СЕ ПОДГОТВУВА ЗАВРШУВАЊЕ",
  "Stopping parking": "Се завршува паркирањето",
  "Preparing stop request": "Се подготвува барање за завршување",
  "Preparing the stop from the saved session details. A current GPS fix is not required.":
    "Се подготвува завршување од зачуваните детали на сесијата. Не е потребна тековна GPS-позиција.",
  "Stop SMS prepared": "SMS-пораката за завршување е подготвена",
  "Closing the SMS composer alone does not prove that parking has stopped.":
    "Самото затворање на прозорецот за SMS-порака не потврдува дека паркирањето е завршено.",
  "The stop SMS is prepared, but parking may still be active. Confirm only after you receive a stop response from ЈП Паркинзи.":
    "SMS-пораката за завршување е подготвена, но паркирањето можеби сè уште е активно. Потврдете само откако ќе добиете одговор за завршување од ЈП Паркинзи.",
  "Preparing a simulated stop. This does not use SMS or GPS.":
    "Се подготвува симулирано завршување. Не се користат SMS ниту GPS.",
  "Simulated stop prepared": "Симулираното завршување е подготвено",
  "The simulated stop is prepared. Confirm it manually to complete this development session.":
    "Симулираното завршување е подготвено. Потврдете го рачно за да ја завршите оваа развојна сесија.",
  "Confirm simulated stop": "Потврди симулирано завршување",
  "Try stop request again": "Обиди се повторно да завршиш",
  "Return to active parking": "Врати се на активното паркирање",
  "NOT STOPPED YET": "СÈ УШТЕ НЕ Е ЗАВРШЕНО",
  "Confirm parking stopped": "Потврдете дека паркирањето заврши",
  "I sent the stop SMS": "Ја испратив SMS-пораката за завршување",
  "Parking completed": "Паркирањето е завршено",
  "This parking session has been marked complete on this device.":
    "Оваа паркинг-сесија е означена како завршена на овој уред.",
  "This simulated development session is complete.":
    "Оваа симулирана развојна сесија е завршена.",
  "SESSION COMPLETE": "СЕСИЈАТА Е ЗАВРШЕНА",
  "Started": "Започнато",
  "Stopped": "Завршено",
  "Duration": "Времетраење",
  "Final cost": "Краен износ",
  "DONE": "ГОТОВО",
  "VIEW HISTORY": "ПРИКАЖИ ИСТОРИЈА",
  "REQUEST FAILED": "БАРАЊЕТО НЕ УСПЕА",
  "No parking state was confirmed. Clear this request to return home.":
    "Не е потврдена состојба на паркирањето. Исчистете го барањето за да се вратите на почетната страница.",
  "Parking request failed": "Барањето за паркирање не успеа",
  "Return home": "Врати се на почетната страница",
  "Parking departure reminders": "Потсетници при заминување од паркингот",
  "Controls background departure monitoring for the active parking session.":
    "Го контролира следењето во заднина при заминување за активната паркинг-сесија.",
  "Retry reminder check": "Повтори ја проверката на потсетникот",
  "Action needs attention": "Потребно е внимание",
  "Set up parking reminders": "Поставете потсетници за паркирање",
  "Set up reminder": "Постави потсетник",
  "Enable notifications": "Дозволи известувања",
  "Allow background location so Parking can remind you if you leave while a parking session is still active. Parking is never stopped automatically, and no route history is stored.":
    "Дозволете локација во заднина за апликацијата да ве потсети ако заминете додека паркирањето е активно. Паркирањето никогаш не се завршува автоматски и не се чува историја на движење.",
  "Not now": "Не сега",
  "Not active yet": "Сè уште не е активно",
  "Keep this screen open for a moment.":
    "Оставете го овој екран отворен за момент.",
  "Departure reminder": "Потсетник при заминување",
  "Background monitoring": "Следење во заднина",
  "Notifications": "Известувања",
  "Location permission": "Дозвола за локација",
  "Background location": "Локација во заднина",
  "Precise location": "Прецизна локација",
  "Not available": "Не е достапно",
  "Available": "Достапно",
  "Active": "Активно",
  "Inactive": "Неактивно",
  "Enabled": "Вклучено",
  "Disabled": "Исклучено",

  // Completed-session history.
  "Parking history": "Историја на паркирање",
  "History": "Историја",
  "Completed sessions": "Завршени сесии",
  "Completed sessions saved on this device":
    "Завршени сесии зачувани на овој уред",
  "Completed sessions saved only on this device.":
    "Завршените сесии се зачувани само на овој уред.",
  "Opens completed parking sessions saved on this device":
    "Ги отвора завршените паркинг-сесии зачувани на овој уред",
  "Opens the completed parking session details.":
    "Ги отвора деталите за завршената паркинг-сесија.",
  "No parking history yet": "Сè уште нема историја на паркирање",
  "Completed parking sessions will appear here.":
    "Завршените паркинг-сесии ќе се појават тука.",
  "{count} session": "{count} сесија",
  "{count} sessions": "{count} сесии",
  "Clear history": "Избриши ја историјата",
  "Parking history stays on this device until you delete it.":
    "Историјата на паркирање останува на овој уред додека не ја избришете.",
  "Restoring parking history": "Се вчитува историјата на паркирање",
  "Loading completed sessions from this device.":
    "Се вчитуваат завршените сесии од овој уред.",
  "History needs attention": "Потребно е внимание за историјата",
  "History is read-only": "Историјата е само за читање",
  "History is read-only, so stored records were left unchanged.":
    "Историјата е само за читање, па зачуваните записи останаа непроменети.",
  "Finish the current parking receipt before clearing history.":
    "Завршете ја тековната паркинг-потврда пред да ја избришете историјата.",
  "Every completed parking record will be permanently removed from this device. This cannot be undone.":
    "Секој завршен запис за паркирање трајно ќе се отстрани од овој уред. Ова не може да се врати.",
  "Clear parking history?": "Да се избрише историјата на паркирање?",
  "This permanently removes every completed parking record from this device.":
    "Ова трајно ги отстранува сите завршени записи за паркирање од уредот.",
  "Permanently removes every completed parking record from this device after confirmation.":
    "По потврда, трајно ги отстранува сите завршени записи за паркирање од уредот.",
  "Parking details": "Детали за паркирањето",
  "Back to history": "Назад кон историјата",
  "Restoring parking details": "Се вчитуваат деталите за паркирањето",
  "Loading this completed session from your device.":
    "Се вчитува оваа завршена сесија од вашиот уред.",
  "Session summary": "Преглед на сесијата",
  "Simulated parking session": "Симулирана паркинг-сесија",
  "Simulated development session": "Симулирана развојна сесија",
  "Clearly separated from a real operator-confirmed session.":
    "Јасно одделена од вистинска сесија потврдена од операторот.",
  "Confirmed by the parking operator": "Потврдено од паркинг-операторот",
  "Current receipt protected": "Тековната потврда е заштитена",
  "This receipt is stored locally on this device.":
    "Оваа потврда е зачувана локално на овој уред.",
  "This record was left unchanged because parking history could not be loaded safely.":
    "Овој запис остана непроменет бидејќи историјата не можеше безбедно да се вчита.",
  "Finish this parking receipt with Done before deleting its history record.":
    "Завршете ја оваа паркинг-потврда со Готово пред да го избришете записот од историјата.",
  "Completed parking session summary.": "Преглед на завршената паркинг-сесија.",
  "Parking record not found": "Записот за паркирање не е пронајден",
  "This completed session may have been deleted from this device.":
    "Оваа завршена сесија можеби е избришана од уредот.",
  "COMPLETED": "ЗАВРШЕНО",
  "Date": "Датум",
  "Started {time}": "Започнато {time}",
  "Stopped {time}": "Завршено {time}",
  "Zone {code}": "Зона {code}",
  "Vehicle {plate}": "Возило {plate}",
  "Final cost {cost}": "Краен износ {cost}",
  "Session type": "Тип на сесија",
  "Delete record": "Избриши го записот",
  "Delete parking record?": "Да се избрише записот за паркирање?",
  "This permanently removes the completed parking record from this device.":
    "Ова трајно го отстранува завршениот запис за паркирање од уредот.",
  "Permanently removes this completed parking record from this device after confirmation.":
    "По потврда, трајно го отстранува овој завршен запис за паркирање од уредот.",
  "Unknown zone": "Непозната зона",
  "Unknown vehicle": "Непознато возило",
  "Parked location saved": "Паркираната локација е зачувана",
  "Parked location saved. Only the start location snapshot is stored. No route history is kept.":
    "Паркираната локација е зачувана. Се чува само снимката од почетната локација. Не се чува историја на движење.",
  "No parked location saved": "Нема зачувана паркирана локација",
  "No parked location saved for this session.":
    "За оваа сесија нема зачувана паркирана локација.",
  "This completed session does not include a start-location snapshot.":
    "Оваа завршена сесија нема снимка од почетната локација.",
  "Only the parked start location is stored. No route history is kept.":
    "Се чува само почетната паркирана локација. Не се чува историја на движење.",
  "{zoneCode} · {plate} will be permanently removed from this device. This cannot be undone.":
    "{zoneCode} · {plate} трајно ќе се отстрани од овој уред. Ова не може да се врати.",
  "Duration unavailable": "Времетраењето не е достапно",
  "Less than 1 minute": "Помалку од 1 минута",

  // Location, vehicle, persistence, SMS and reminder errors shown in the UI.
  "Location permission was denied. Enable it in your device settings and try again.":
    "Дозволата за локација е одбиена. Дозволете ја во поставките на уредот и обидете се повторно.",
  "Location services are turned off. Enable GPS and try again.":
    "Услугите за локација се исклучени. Вклучете GPS и обидете се повторно.",
  "Your current location is unavailable. Check your GPS signal and try again.":
    "Тековната локација не е достапна. Проверете го GPS-сигналот и обидете се повторно.",
  "We could not read your location. Please try again.":
    "Не можевме да ја прочитаме локацијата. Обидете се повторно.",
  "Device settings could not be opened. Open Settings manually and allow foreground location.":
    "Поставките на уредот не можеа да се отворат. Отворете ги рачно и дозволете пристап до локацијата.",
  "Saved vehicles are still loading. Please try again.":
    "Зачуваните возила сè уште се вчитуваат. Обидете се повторно.",
  "A supported parking zone has not been identified.":
    "Не е утврдена поддржана паркинг-зона.",
  "The parking request preview is invalid.":
    "Прегледот на барањето за паркирање не е валиден.",
  "The parking session could not be prepared.":
    "Паркинг-сесијата не можеше да се подготви.",
  "The prepared start request could not be saved.":
    "Подготвеното барање за започнување не можеше да се зачува.",
  "The prepared stop request could not be saved.":
    "Подготвеното барање за завршување не можеше да се зачува.",
  "The parking session could not begin stopping.":
    "Паркинг-сесијата не можеше да започне со завршување.",
  "The pending parking session could not be cancelled.":
    "Паркинг-сесијата што чека потврда не можеше да се откаже.",
  "The parking session could not be completed.":
    "Паркинг-сесијата не можеше да се заврши.",
  "The completed parking session could not be restored.":
    "Завршената паркинг-сесија не можеше да се врати.",
  "The completed session could not be cleared.":
    "Завршената сесија не можеше да се исчисти.",
  "The parking session could not be confirmed.":
    "Паркинг-сесијата не можеше да се потврди.",
  "The active parking session could not be restored.":
    "Активната паркинг-сесија не можеше да се врати.",
  "The failed session could not be cleared.":
    "Неуспешната сесија не можеше да се исчисти.",
  "The parking start request could not be prepared.":
    "Барањето за започнување паркирање не можеше да се подготви.",
  "The SMS composer was cancelled. No parking start request was prepared.":
    "Составувањето SMS-порака беше откажано. Не е подготвено барање за започнување паркирање.",
  "The SMS composer could not be opened.":
    "Прозорецот за SMS-порака не можеше да се отвори.",
  "The SMS composer result does not confirm that the parking operator accepted the request.":
    "Резултатот од SMS-пораката не потврдува дека паркинг-операторот го прифатил барањето.",
  "An SMS recipient is required.": "Потребен е SMS-примач.",
  "An SMS message is required.": "Потребна е SMS-порака.",
  "SMS is not available on this device.": "SMS не е достапен на овој уред.",
  "The SMS composer returned an unsupported result.":
    "Прозорецот за SMS-порака врати неподдржан резултат.",
  "Use 2 letters, 3 or 4 digits, then 2 letters (for example BT7713AD).":
    "Внесете 2 букви, 3 или 4 цифри, па 2 букви (на пример BT7713AD).",
  "Vehicle not found.": "Возилото не е пронајдено.",
  "Plate is required.": "Потребна е регистарска табличка.",
  "Unable to save this vehicle.": "Возилото не може да се зачува.",
  "Unable to delete this vehicle.": "Возилото не може да се избрише.",
  "Unable to select this vehicle.": "Возилото не може да се избере.",
  "A vehicle with plate {plate} already exists.":
    "Веќе постои возило со табличка {plate}.",
  "Parking zone code is required.": "Потребен е код на паркинг-зоната.",
  "Parking zone code must be {count} characters or fewer.":
    "Кодот на паркинг-зоната мора да има најмногу {count} знаци.",
  "Parking zone code must start with a letter and contain only letters, numbers, and single hyphens.":
    "Кодот на паркинг-зоната мора да почнува со буква и да содржи само букви, бројки и единечни цртички.",
  "Parking history is still loading. Please try again shortly.":
    "Историјата на паркирање сè уште се вчитува. Обидете се повторно наскоро.",
  "Parking history is read-only because its stored data could not be loaded safely.":
    "Историјата на паркирање е само за читање бидејќи зачуваните податоци не можеа безбедно да се вчитаат.",
  "Parking history could not be saved. Your completed session remains available so you can try again.":
    "Историјата не можеше да се зачува. Завршената сесија останува достапна за повторен обид.",
  "Parking history could not be saved. No history changes were applied.":
    "Историјата не можеше да се зачува. Не се применети промени.",
  "Parking history could not be cleared. Please try again.":
    "Историјата на паркирање не можеше да се избрише. Обидете се повторно.",
  "This parking record could not be deleted. Please try again.":
    "Овој запис за паркирање не можеше да се избрише. Обидете се повторно.",
  "Some stored parking history was invalid and was removed safely.":
    "Дел од зачуваната историја беше невалиден и е безбедно отстранет.",
  "Only a valid completed parking session can be added to history.":
    "Во историјата може да се додаде само валидна завршена паркинг-сесија.",
  "Parking history was created by a newer app version and is read-only in this version.":
    "Историјата е создадена со понова верзија на апликацијата и тука е само за читање.",
  "Valid parking history was restored, but stored data could not be repaired safely. History is read-only.":
    "Валидната историја е вратена, но зачуваните податоци не можеа безбедно да се поправат. Историјата е само за читање.",
  "Parking history could not be loaded safely. Stored data was left unchanged.":
    "Историјата не можеше безбедно да се вчита. Зачуваните податоци останаа непроменети.",
  "Background parking reminders require Android or iOS.":
    "Потсетниците во заднина бараат Android или iOS.",
  "Background location is not supported for this feature in Expo Go. Use a development build.":
    "Локацијата во заднина не е поддржана за оваа функција во Expo Go. Користете развојна верзија.",
  "Background tasks are unavailable in this runtime.":
    "Задачите во заднина не се достапни во ова опкружување.",
  "Location services are disabled on this device.":
    "Услугите за локација се исклучени на овој уред.",
  "Background location is unavailable on this device.":
    "Локацијата во заднина не е достапна на овој уред.",
  "Location permission is unavailable on this platform.":
    "Дозволата за локација не е достапна на оваа платформа.",
  "Foreground location permission is required.":
    "Потребна е дозвола за локација додека ја користите апликацијата.",
  "Background location permission is required.":
    "Потребна е дозвола за локација во заднина.",
  "Precise location is required for conservative parking departure reminders.":
    "Потребна е прецизна локација за внимателните потсетници при заминување.",
  "Notifications are disabled. Parking still works.":
    "Известувањата се исклучени. Паркирањето и понатаму работи.",
  "Background departure monitoring is active.":
    "Следењето во заднина при заминување е активно.",
  "Departure reminders are off.": "Потсетниците при заминување се исклучени.",
  "No active parking session.": "Нема активна паркинг-сесија.",
  "Departure monitoring starts only while parking is active.":
    "Следењето при заминување започнува само додека паркирањето е активно.",
  "No usable parked location was captured for this session.":
    "За оваа сесија не е снимена употреблива паркирана локација.",
  "This parking session cannot use departure reminders.":
    "Оваа паркинг-сесија не може да користи потсетници при заминување.",
  "Reminder state could not be restored safely.":
    "Состојбата на потсетникот не можеше безбедно да се врати.",
  "Reminder state could not be prepared safely.":
    "Состојбата на потсетникот не можеше безбедно да се подготви.",
  "Departure reminder sent. Parking is still active.":
    "Испратен е потсетник при заминување. Паркирањето сè уште е активно.",
  "A departure reminder delivery was already attempted for this session.":
    "Веќе имаше обид за испорака на потсетник за оваа сесија.",
  "Parking reminder availability could not be checked.":
    "Достапноста на потсетникот не можеше да се провери.",
  "Reminder settings could not be restored safely.":
    "Поставките за потсетници не можеа безбедно да се вратат.",
  "Reminder settings could not be refreshed.":
    "Поставките за потсетници не можеа да се освежат.",
  "The parking reminder preference could not be saved.":
    "Поставката за потсетници не можеше да се зачува.",
  "Parking reminder permissions could not be updated.":
    "Дозволите за потсетници не можеа да се ажурираат.",
  "Background monitoring could not be stopped.":
    "Следењето во заднина не можеше да се запре.",
  "The parking session delivery mode is invalid.":
    "Режимот за испорака на паркинг-сесијата е невалиден.",
  "The parking session snapshot is incomplete.":
    "Снимката од паркинг-сесијата е нецелосна.",
  "The parking session does not match the configured production operator.":
    "Паркинг-сесијата не се совпаѓа со конфигурираниот продукциски оператор.",
  "The persisted stop SMS snapshot is invalid.":
    "Зачуваната снимка на SMS-пораката за завршување е невалидна.",
  "The persisted stop SMS snapshot does not match the configured protocol.":
    "Зачуваната снимка на SMS-пораката за завршување не се совпаѓа со конфигурираниот протокол.",
  "The parking session contains an invalid zone or vehicle snapshot.":
    "Паркинг-сесијата содржи невалидна снимка на зона или возило.",
  "The parking session SMS snapshot no longer matches the configured protocol.":
    "SMS-снимката од паркинг-сесијата повеќе не се совпаѓа со конфигурираниот протокол.",
  "Only production SMS sessions can use the real start composer.":
    "Само продукциски SMS-сесии може да го користат вистинскиот прозорец за започнување.",
  "The parking zone is not in the configured production catalogue.":
    "Паркинг-зоната не е во конфигурираниот продукциски каталог.",
  "The parking session no longer matches the eligible production SMS request.":
    "Паркинг-сесијата повеќе не се совпаѓа со дозволеното продукциско SMS-барање.",
  "The production SMS recipient is missing.":
    "Недостасува примачот на продукциската SMS-порака.",
  "The parking session update produced an invalid snapshot.":
    "Ажурирањето на паркинг-сесијата создаде невалидна снимка.",
  "The current parking session is invalid and cannot be changed.":
    "Тековната паркинг-сесија е невалидна и не може да се промени.",
};

export function interpolateTranslation(
  template: string,
  params?: TranslationParams,
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, name) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(
  language: AppLanguage,
  source: string,
  params?: TranslationParams,
): string {
  const template =
    language === "mk" ? MACEDONIAN_TRANSLATIONS[source] ?? source : source;

  return interpolateTranslation(template, params);
}

type MessagePattern = {
  pattern: RegExp;
  translate: (language: AppLanguage, match: RegExpMatchArray) => string;
};

const KNOWN_MESSAGE_PATTERNS: readonly MessagePattern[] = [
  {
    pattern: /^A vehicle with plate (.+) already exists\.$/,
    translate: (language, match) =>
      translate(language, "A vehicle with plate {plate} already exists.", {
        plate: match[1],
      }),
  },
  {
    pattern: /^Parking zone code must be (\d+) characters or fewer\.$/,
    translate: (language, match) =>
      translate(
        language,
        "Parking zone code must be {count} characters or fewer.",
        { count: match[1] },
      ),
  },
  {
    pattern: /^The (start|stop) SMS composer is already open\.$/,
    translate: (language, match) => {
      if (language === "en") {
        return match[0];
      }
      return match[1] === "start"
        ? "Прозорецот за SMS-порака за започнување е веќе отворен."
        : "Прозорецот за SMS-порака за завршување е веќе отворен.";
    },
  },
  {
    pattern:
      /^The (start|stop) SMS composer requires an explicit user action\.$/,
    translate: (language, match) => {
      if (language === "en") {
        return match[0];
      }
      return match[1] === "start"
        ? "За SMS-пораката за започнување е потребно изречно дејство од корисникот."
        : "За SMS-пораката за завршување е потребно изречно дејство од корисникот.";
    },
  },
  {
    pattern:
      /^The (start|stop) request cannot be prepared from session status (.+)\.$/,
    translate: (language, match) => {
      if (language === "en") {
        return match[0];
      }
      const action = match[1] === "start" ? "започнување" : "завршување";
      return `Барањето за ${action} не може да се подготви од статусот ${match[2]}.`;
    },
  },
  {
    pattern:
      /^The SMS composer was cancelled\. The parking (start|stop) request was not prepared\.$/,
    translate: (language, match) => {
      if (language === "en") {
        return match[0];
      }
      const action = match[1] === "start" ? "започнување" : "завршување";
      return `Составувањето SMS-порака беше откажано. Барањето за ${action} паркирање не е подготвено.`;
    },
  },
  {
    pattern:
      /^The parking (start|stop) request could not be prepared\.$/,
    translate: (language, match) => {
      if (language === "en") {
        return match[0];
      }
      const action = match[1] === "start" ? "започнување" : "завршување";
      return `Барањето за ${action} паркирање не можеше да се подготви.`;
    },
  },
  {
    pattern:
      /^Parking history storage version (.+) is newer than supported version (.+)\.$/,
    translate: (language, match) =>
      language === "en"
        ? match[0]
        : `Верзијата ${match[1]} на зачуваната историја е понова од поддржаната верзија ${match[2]}.`,
  },
  {
    pattern: /^Development Zone (TEST-[A-Z0-9-]+)$/,
    translate: (language, match) =>
      language === "en" ? match[0] : `Развојна зона ${match[1]}`,
  },
  {
    pattern: /^Bitola zone ([A-Z0-9-]+) \(unverified\)$/,
    translate: (language, match) =>
      language === "en"
        ? match[0]
        : `Зона ${match[1]} во Битола (непотврдена)`,
  },
];

export function translateKnownMessage(
  language: AppLanguage,
  message: string,
): string {
  const exact = translate(language, message);

  if (language === "en" || exact !== message) {
    return exact;
  }

  for (const candidate of KNOWN_MESSAGE_PATTERNS) {
    const match = message.match(candidate.pattern);
    if (match) {
      return candidate.translate(language, match);
    }
  }

  return language === "mk"
    ? "Се појави неочекувана грешка. Обидете се повторно."
    : message;
}
