/* =========================================================
   MHRA – Dynamic Language Switch (MK ↔ EN)
   One HTML set, translation via JS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const langButtons = document.querySelectorAll("[data-lang]");
  let currentLang = localStorage.getItem("mhra-lang") || "mk";

  applyTranslations(currentLang);
  updateActiveLangUI(currentLang);

  langButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      localStorage.setItem("mhra-lang", lang);
      applyTranslations(lang);
      updateActiveLangUI(lang);
    });
  });
});

/* ========== TRANSLATION DICTIONARY ========== */

const translations = {
  mk: {
    /* NAV */
    nav_home: "Почетна",
    nav_about: "За нас",
    nav_activities: "Активности",
    nav_galleries: "Галерии",
    nav_events: "HR настани",
    nav_membership: "Членство",
    nav_contact: "Контакт",

    nav_cta_join: "Стани член",

        nav_blog: "Блог",
    blog_title: "Блог",
    blog_sub: "Статии, анализи и објави од областа на човечките ресурси.",
    blog_no_posts: "Во моментов нема објавени блог текстови.",


    /* FOOTER */
    footer_brand: "Македонска асоцијација за човечки ресурси (МАЧР)",
    footer_desc: "Платформа за развој и поврзување на HR професионалци и организации.",
    footer_contact: "Контакт",
    footer_links_title: "Линкови",
    footer_link_home: "Почетна",
    footer_link_membership: "Членство",
    footer_link_contact: "Контакт",
    footer_link_privacy: "Политика на приватност",
    footer_link_terms: "Услови за користење",
    footer_rights: "All rights reserved.",

    /* INDEX (HOME) */
    home_hero_kicker: "Професионална HR заедница",
    home_hero_title: "Луѓето пред сè",
    home_hero_sub: "Македонска асоцијација за човечки ресурси – платформа за развој, учење и вмрежување на HR професионалците во земјата.",
    home_hero_meta_1: "HR конференции, обуки и истражувања",
    home_hero_meta_2: "Поддршка за HR практичари и организации",
    home_hero_next_event_eyebrow: "Следен настан",
    home_hero_next_event_title: "HR Конференција 2025",
    home_hero_next_event_meta: "Скопје · мај 2025",
    home_hero_next_event_body: "Годишен собир на HR професионалци, лидери и експерти за современи трендови во управување со човечки ресурси.",
    home_hero_btn_join: "Стани член",
    home_hero_btn_more: "Повеќе за нас",
    home_hero_btn_agenda: "Види агенда",

    home_events_title: "Следни настани",
    home_events_sub: "Краток преглед на активностите на МАЧР.",
    home_event1_eyebrow: "HR кафе",
    home_event1_title: "HR кафе: Вработување на таленти",
    home_event1_meta: "онлајн · 12.02.2025",
    home_event1_body: "Неформално утринско дружење и размена на искуства помеѓу HR практичари.",
    home_event2_eyebrow: "HR обука",
    home_event2_title: "Практикум за перформанс менаџмент",
    home_event2_meta: "Скопје · 05.03.2025",
    home_event2_body: "Интерактивна обука за поставување цели, KPIs и развојни разговори.",
    home_event3_eyebrow: "HR Weekend",
    home_event3_title: "HR Weekend: Лидерство и култура",
    home_event3_meta: "Охрид · 2025",
    home_event3_body: "Тродневен програм со предавања, работилници и неформално вмрежување.",
    home_event_btn_more: "Види повеќе",

    home_news_title: "Новости",
    home_news_sub: "Информации за тековни активности и соопштенија.",
    home_news1_eyebrow: "соопштение",
    home_news1_title: "Отворен повик за HR награди",
    home_news1_meta: "јануари 2025",
    home_news1_body: "Кандидирајте ја вашата организација или HR тим за годишните награди на МАЧР.",
    home_news2_eyebrow: "истражување",
    home_news2_title: "Истражување за состојбата на HR професијата",
    home_news2_meta: "декември 2024",
    home_news2_body: "Анкета за практиките на управување со човечки ресурси во македонските компании.",
    home_news3_eyebrow: "интервју",
    home_news3_title: "Интервју со HR менаџер на годината",
    home_news3_meta: "ноември 2024",
    home_news3_body: "Разговор за искуствата, предизвиците и идните планови во HR професијата.",
    home_news_btn_read: "Прочитај повеќе",


    /* BLOG */
    nav_blog: "Блог",
    blog_title: "Блог",
    blog_sub: "Статии, анализи и објави од областа на човечките ресурси.",
    blog_read_more: "Прочитај повеќе",
    blog_new_post: "Напиши блог",


    /* ABOUT */
    about_title: "За нас",
    about_sub: "Професионална асоцијација посветена на развој на HR професијата во Македонија.",
    about_mission_title: "Мисија",
    about_mission_body: "Мисијата на МАЧР е да ја поддржи изградбата на современи HR практики, да овозможи размена на знаење, искуства и алатки и да придонесе кон создавање на работна средина во која луѓето се во фокусот.",
    about_vision_title: "Визија",
    about_vision_body: "Визијата на асоцијацијата е да стане референтна точка за HR професионалците и организациите, препознаена по своето влијание врз квалитетот на управување со човечки ресурси.",
    about_bodies_title: "Тела на МАЧР",
    about_bodies_sub: "Органи и структура на асоцијацијата.",
    about_pres_title: "Претседател",
    about_pres_body: "Кратка биографија на претседателот на МАЧР, професионално искуство и област на експертиза. (пример текст за пополнување).",
    about_board_title: "Одбор на МАЧР",
    about_board_body: "Одборот ги дефинира стратешките правци на асоцијацијата и ги надгледува програмите и активностите.",
    about_struct_title: "Организациска поставеност",
    about_struct_body: "Асоцијацијата функционира преку работни групи, комитети и ограноци кои се фокусирани на различни HR теми.",
    about_coaching_title: "Огранок за коучинг",
    about_coaching_sub: "Специјализиран сегмент посветен на коучинг практики.",
    about_coaching_body: "Огранокот за коучинг ги обединува професионалците кои работат со индивидуален и тимски коучинг, поддржувајќи ги организациските промени, лидерството и личниот развој. Овој сегмент организира обуки, супервизии и тематски средби.",

    /* ACTIVITIES */
    act_title: "Активности",
    act_sub: "Програми и иницијативи преку кои МАЧР ја поддржува HR заедницата.",
    act_awards_title: "HR награди",
    act_awards_sub: "Годишно препознавање на истакнати HR практики и професионалци.",
    act_award_essay: "HR есеј",
    act_award_essay_body: "Конкурс за млади и искусни HR професионалци кои сакаат да ги споделат своите ставови за иднината на HR професијата.",
    act_award_manager: "HR менаџер на годината",
    act_award_manager_body: "Награда за лидер кој има значаен придонес во развојот на луѓето и организациската култура.",
    act_award_practice: "HR практика на годината",
    act_award_practice_body: "Препознавање на успешна HR иницијатива или систем воведен во организацијата.",
    act_award_young: "Млад HR ентузијаст",
    act_award_young_body: "Награда за млада личност која демонстрира посветеност и потенцијал во HR областа.",

    act_newsletter_title: "Е-Весник на МАЧР",
    act_newsletter_sub: "Електронско издание со статии, интервјуа и преглед на активностите.",
    act_newsletter_item1: "Е-Весник бр. 1 · март 2024",
    act_newsletter_item2: "Е-Весник бр. 2 · септември 2024",
    act_newsletter_item3: "Е-Весник бр. 3 · март 2025",

    act_projects_title: "Проекти",
    act_projects_sub: "Национални и меѓународни проекти во кои учествува МАЧР.",
    act_proj_a_title: "Проект А",
    act_proj_a_meta: "2024–2025 · Партнерство со регионални организации",
    act_proj_a_body: "Пример опис на проект кој се фокусира на развој на HR стандарди и обуки.",
    act_proj_b_title: "Проект Б",
    act_proj_b_meta: "2023–2024",
    act_proj_b_body: "Истражување на трендовите во управувањето со таленти во компании од различни индустрии.",
    act_proj_c_title: "Проект В",
    act_proj_c_meta: "во тек",
    act_proj_c_body: "Развивање на алатки и ресурси за HR професионалци во малите и средни претпријатија.",

    act_archive_title: "Архива",
    act_archive_sub: "Избрани минати настани и активности.",
    act_archive_item1: "HR Конференција 2023 · Скопје",
    act_archive_item2: "HR Weekend 2022 · Охрид",
    act_archive_item3: "Серија HR кафе настани 2021–2024",

    /* GALLERIES */
    gal_title: "Галерии",
    gal_sub: "Фото албуми од конференции, обуки и други HR настани.",
    gal_item1_title: "HR Конференција 2024",
    gal_item1_meta: "Скопје · 2024",
    gal_item1_body: "Краток опис на конференцијата и атмосферата.",
    gal_item2_title: "HR Weekend 2023",
    gal_item2_meta: "Охрид · 2023",
    gal_item2_body: "Работилници, дискусии и неформални активности со учесниците.",
    gal_item3_title: "HR кафе серија",
    gal_item3_meta: "онлајн и во живо",
    gal_item3_body: "Избрани моменти од тематски HR кафе настани.",
    gal_note: "* Во иднина, овде може да се додадат линкови до галерии со фотографии.",

    /* EVENTS */
    ev_title: "HR настани",
    ev_sub: "HR кафе, конференции, HR Weekend и обуки организирани од МАЧР.",
    ev_filter_title: "Филтер по тип",
    ev_filter_all: "Сите",
    ev_filter_cafe: "HR кафе",
    ev_filter_conf: "HR конференција",
    ev_filter_weekend: "HR Weekend",
    ev_filter_training: "HR обуки",
    ev_badge_cafe: "HR кафе",
    ev_badge_conf: "HR конференција",
    ev_badge_weekend: "HR Weekend",
    ev_badge_training: "HR обука",
    ev_card1_title: "HR кафе: Вработување на таленти",
    ev_card1_meta: "онлајн · 12.02.2025",
    ev_card1_body: "Неформална дискусија за стратегии за привлекување и задржување на таленти.",
    ev_card2_title: "HR Конференција 2025",
    ev_card2_meta: "Скопје · мај 2025",
    ev_card2_body: "Годишна конференција со предавачи од земјата и странство.",
    ev_card3_title: "HR Weekend: Лидерство и култура",
    ev_card3_meta: "Охрид · 2025",
    ev_card3_body: "Комбинација од работилници, панел дискусии и тим билдинг активности.",
    ev_card4_title: "Практикум за перформанс менаџмент",
    ev_card4_meta: "Скопје · 05.03.2025",
    ev_card4_body: "Практична програма за воведување или подобрување на системите за оценување.",
    ev_card5_title: "Обука за интервјуирање",
    ev_card5_meta: "онлајн · 2025",
    ev_card5_body: "Кратка онлајн обука за структуирани и компетенциски интервјуа.",
    ev_card6_title: "HR кафе: Вработени искуства",
    ev_card6_meta: "Скопје · 2025",
    ev_card6_body: "Размена на идеи за подобрување на employee experience.",

    /* MEMBERSHIP */
    memb_title: "Членство во МАЧР",
    memb_sub: "Стани дел од професионалната HR заедница.",
    memb_ind_title: "Индивидуално членство",
    memb_ind_body: "Индивидуалното членство е наменето за HR професионалци, менаџери и лица кои работат со луѓе и организациски развој.",
    memb_ind_b1: "✔ Пристап до настани по поволни услови",
    memb_ind_b2: "✔ Можност за учество во работни групи",
    memb_ind_b3: "✔ Пристап до избрани HR ресурси и истражувања",
    memb_ind_fee: "Членарина: [пример износ]",
    memb_ind_label_name: "Име и презиме",
    memb_ind_label_email: "Email",
    memb_ind_label_phone: "Телефон",
    memb_ind_label_org: "Организација",
    memb_ind_label_terms: "Се согласувам со условите за членство.",
    memb_ind_btn: "Испрати пријава",

    memb_corp_title: "Корпоративно членство",
    memb_corp_body: "Корпоративното членство им овозможува на организациите да ги вклучат своите HR тимови и менаџмент во активностите на МАЧР.",
    memb_corp_table_h1: "Пакет",
    memb_corp_table_h2: "Број на членови",
    memb_corp_table_h3: "Погодности",
    memb_corp_row1_p: "Basic",
    memb_corp_row1_n: "до 3 лица",
    memb_corp_row1_b: "Попуст на настани",
    memb_corp_row2_p: "Standard",
    memb_corp_row2_n: "до 6 лица",
    memb_corp_row2_b: "Дополнителни бесплатни активности",
    memb_corp_row3_p: "Premium",
    memb_corp_row3_n: "10+ лица",
    memb_corp_row3_b: "Зголемена видливост и партнерство",
    memb_corp_label_org: "Име на организација",
    memb_corp_label_contact: "Контакт лице",
    memb_corp_label_email: "Email",
    memb_corp_label_phone: "Телефон",
    memb_corp_label_package: "Изберете пакет",
    memb_corp_btn: "Испрати барање",

    /* CONTACT */
    contact_title: "Контакт",
    contact_sub: "Контактирајте нè за членство, соработка или дополнителни информации.",
    contact_card_title: "Контакт податоци",
    contact_card_body: "Адреса: [пример адреса]<br />Email: info@mhra.mk<br />Телефон: +389 2 000 000<br />Работно време: понеделник – петок, 09:00–17:00",
    contact_loc_title: "Локација",
    contact_loc_box: "Тука може да се вметне мапа (Google Maps embed) во иднина.",
    contact_form_title: "Испратете порака",
    contact_label_name: "Име и презиме",
    contact_label_email: "Email",
    contact_label_subject: "Наслов",
    contact_label_message: "Порака",
    contact_btn_send: "Испрати",
  },

  /* ======================== ENGLISH ======================== */

  en: {
    /* NAV */
    nav_home: "Home",
    nav_about: "About Us",
    nav_activities: "Activities",
    nav_galleries: "Galleries",
    nav_events: "HR Events",
    nav_membership: "Membership",
    nav_contact: "Contact",

    nav_cta_join: "Become a Member",

        nav_blog: "Blog",
    blog_title: "Blog",
    blog_sub: "Articles, analysis and publications from the HR field.",
    blog_no_posts: "There are no blog posts yet.",



    /* FOOTER */
    footer_brand: "Macedonian Human Resources Association (MHRA)",
    footer_desc: "A platform for development and networking of HR professionals and organizations.",
    footer_contact: "Contact",
    footer_links_title: "Links",
    footer_link_home: "Home",
    footer_link_membership: "Membership",
    footer_link_contact: "Contact",
    footer_link_privacy: "Privacy Policy",
    footer_link_terms: "Terms of Use",
    footer_rights: "All rights reserved.",

    /* INDEX (HOME) */
    home_hero_kicker: "Professional HR Community",
    home_hero_title: "People First",
    home_hero_sub: "Macedonian Human Resources Association – a platform for development, learning and networking of HR professionals in the country.",
    home_hero_meta_1: "HR conferences, trainings and research",
    home_hero_meta_2: "Support for HR practitioners and organizations",
    home_hero_next_event_eyebrow: "Next Event",
    home_hero_next_event_title: "HR Conference 2025",
    home_hero_next_event_meta: "Skopje · May 2025",
    home_hero_next_event_body: "Annual gathering of HR professionals, leaders and experts on modern HR trends.",
    home_hero_btn_join: "Become a Member",
    home_hero_btn_more: "Learn More About Us",
    home_hero_btn_agenda: "View Agenda",

    home_events_title: "Upcoming Events",
    home_events_sub: "Brief overview of MHRA activities.",
    home_event1_eyebrow: "HR Café",
    home_event1_title: "HR Café: Talent Recruitment",
    home_event1_meta: "online · 12.02.2025",
    home_event1_body: "Informal morning meeting and exchange of experiences between HR practitioners.",
    home_event2_eyebrow: "HR Training",
    home_event2_title: "Performance Management Workshop",
    home_event2_meta: "Skopje · 05.03.2025",
    home_event2_body: "Interactive training on goal-setting, KPIs and development conversations.",
    home_event3_eyebrow: "HR Weekend",
    home_event3_title: "HR Weekend: Leadership and Culture",
    home_event3_meta: "Ohrid · 2025",
    home_event3_body: "Three-day programme with lectures, workshops and informal networking.",
    home_event_btn_more: "View More",

    home_news_title: "News",
    home_news_sub: "Information on current activities and announcements.",
    home_news1_eyebrow: "announcement",
    home_news1_title: "Open Call for HR Awards",
    home_news1_meta: "January 2025",
    home_news1_body: "Nominate your organization or HR team for MHRA annual awards.",
    home_news2_eyebrow: "research",
    home_news2_title: "HR Profession Status Survey",
    home_news2_meta: "December 2024",
    home_news2_body: "Survey on HR management practices in Macedonian companies.",
    home_news3_eyebrow: "interview",
    home_news3_title: "Interview with HR Manager of the Year",
    home_news3_meta: "November 2024",
    home_news3_body: "Discussion about experiences, challenges and future plans in HR.",
    home_news_btn_read: "Read More",

    /* BLOG */
    nav_blog: "Blog",
    blog_title: "Blog",
    blog_sub: "Articles, analysis and announcements from the HR field.",
    blog_read_more: "Read More",
    blog_new_post: "Write a blog post",


    /* ABOUT */
    about_title: "About Us",
    about_sub: "A professional association dedicated to developing the HR profession in North Macedonia.",
    about_mission_title: "Mission",
    about_mission_body: "MHRA’s mission is to support the development of modern HR practices, enable exchange of knowledge, experience and tools, and contribute to a work environment where people are in focus.",
    about_vision_title: "Vision",
    about_vision_body: "The association’s vision is to become a reference point for HR professionals and organizations, recognized for its impact on the quality of human resources management.",
    about_bodies_title: "MHRA Bodies",
    about_bodies_sub: "Governance and organizational structure.",
    about_pres_title: "President",
    about_pres_body: "Short biography of MHRA President, professional experience and field of expertise. (sample placeholder text).",
    about_board_title: "MHRA Board",
    about_board_body: "The Board defines the strategic direction of the association and oversees programmes and activities.",
    about_struct_title: "Organizational Structure",
    about_struct_body: "The association operates through working groups, committees and branches focused on different HR topics.",
    about_coaching_title: "Coaching Branch",
    about_coaching_sub: "Specialized segment dedicated to coaching practices.",
    about_coaching_body: "The Coaching branch brings together professionals working with individual and team coaching, supporting organizational change, leadership and personal development. It organizes trainings, supervisions and thematic meetings.",

    /* ACTIVITIES */
    act_title: "Activities",
    act_sub: "Programmes and initiatives through which MHRA supports the HR community.",
    act_awards_title: "HR Awards",
    act_awards_sub: "Annual recognition of outstanding HR practices and professionals.",
    act_award_essay: "HR Essay",
    act_award_essay_body: "Call for young and experienced HR professionals to share their views on the future of the HR profession.",
    act_award_manager: "HR Manager of the Year",
    act_award_manager_body: "Award for a leader with significant contribution to people development and organizational culture.",
    act_award_practice: "HR Practice of the Year",
    act_award_practice_body: "Recognition of a successful HR initiative or system introduced in the organization.",
    act_award_young: "Young HR Enthusiast",
    act_award_young_body: "Award for a young person who demonstrates commitment and potential in HR.",

    act_newsletter_title: "MHRA E-Newsletter",
    act_newsletter_sub: "Electronic publication with articles, interviews and overview of activities.",
    act_newsletter_item1: "E-Newsletter No.1 · March 2024",
    act_newsletter_item2: "E-Newsletter No.2 · September 2024",
    act_newsletter_item3: "E-Newsletter No.3 · March 2025",

    act_projects_title: "Projects",
    act_projects_sub: "National and international projects in which MHRA participates.",
    act_proj_a_title: "Project A",
    act_proj_a_meta: "2024–2025 · Partnership with regional organizations",
    act_proj_a_body: "Sample description of a project focused on HR standards and trainings.",
    act_proj_b_title: "Project B",
    act_proj_b_meta: "2023–2024",
    act_proj_b_body: "Research on talent management trends in companies from different industries.",
    act_proj_c_title: "Project C",
    act_proj_c_meta: "ongoing",
    act_proj_c_body: "Developing tools and resources for HR professionals in SMEs.",

    act_archive_title: "Archive",
    act_archive_sub: "Selected past events and activities.",
    act_archive_item1: "HR Conference 2023 · Skopje",
    act_archive_item2: "HR Weekend 2022 · Ohrid",
    act_archive_item3: "HR Café events series 2021–2024",

    /* GALLERIES */
    gal_title: "Galleries",
    gal_sub: "Photo albums from conferences, trainings and other HR events.",
    gal_item1_title: "HR Conference 2024",
    gal_item1_meta: "Skopje · 2024",
    gal_item1_body: "Short description of the conference and atmosphere.",
    gal_item2_title: "HR Weekend 2023",
    gal_item2_meta: "Ohrid · 2023",
    gal_item2_body: "Workshops, discussions and informal activities with participants.",
    gal_item3_title: "HR Café Series",
    gal_item3_meta: "online and in-person",
    gal_item3_body: "Selected moments from thematic HR Café events.",
    gal_note: "* In the future, links to full photo galleries can be added here.",

    /* EVENTS */
    ev_title: "HR Events",
    ev_sub: "HR cafés, conferences, HR Weekends and trainings organized by MHRA.",
    ev_filter_title: "Filter by type",
    ev_filter_all: "All",
    ev_filter_cafe: "HR Café",
    ev_filter_conf: "HR Conference",
    ev_filter_weekend: "HR Weekend",
    ev_filter_training: "HR Trainings",
    ev_badge_cafe: "HR Café",
    ev_badge_conf: "HR Conference",
    ev_badge_weekend: "HR Weekend",
    ev_badge_training: "HR Training",
    ev_card1_title: "HR Café: Talent Recruitment",
    ev_card1_meta: "online · 12.02.2025",
    ev_card1_body: "Informal discussion on strategies for attracting and retaining talent.",
    ev_card2_title: "HR Conference 2025",
    ev_card2_meta: "Skopje · May 2025",
    ev_card2_body: "Annual conference with speakers from the country and abroad.",
    ev_card3_title: "HR Weekend: Leadership and Culture",
    ev_card3_meta: "Ohrid · 2025",
    ev_card3_body: "Combination of workshops, panel discussions and teambuilding activities.",
    ev_card4_title: "Performance Management Workshop",
    ev_card4_meta: "Skopje · 05.03.2025",
    ev_card4_body: "Practical programme for introducing or improving performance appraisal systems.",
    ev_card5_title: "Interview Skills Training",
    ev_card5_meta: "online · 2025",
    ev_card5_body: "Short online training on structured and competency-based interviews.",
    ev_card6_title: "HR Café: Employee Experience",
    ev_card6_meta: "Skopje · 2025",
    ev_card6_body: "Exchange of ideas for improving the employee experience.",

    /* MEMBERSHIP */
    memb_title: "MHRA Membership",
    memb_sub: "Become part of the professional HR community.",
    memb_ind_title: "Individual Membership",
    memb_ind_body: "Individual membership is intended for HR professionals, managers and people working with people and organizational development.",
    memb_ind_b1: "✔ Access to events at preferential conditions",
    memb_ind_b2: "✔ Possibility to participate in working groups",
    memb_ind_b3: "✔ Access to selected HR resources and research",
    memb_ind_fee: "Membership fee: [sample amount]",
    memb_ind_label_name: "Full Name",
    memb_ind_label_email: "Email",
    memb_ind_label_phone: "Phone",
    memb_ind_label_org: "Organization",
    memb_ind_label_terms: "I agree with the membership terms.",
    memb_ind_btn: "Send Application",

    memb_corp_title: "Corporate Membership",
    memb_corp_body: "Corporate membership enables organizations to engage their HR teams and management in MHRA activities.",
    memb_corp_table_h1: "Package",
    memb_corp_table_h2: "Number of members",
    memb_corp_table_h3: "Benefits",
    memb_corp_row1_p: "Basic",
    memb_corp_row1_n: "up to 3 people",
    memb_corp_row1_b: "Event discount",
    memb_corp_row2_p: "Standard",
    memb_corp_row2_n: "up to 6 people",
    memb_corp_row2_b: "Additional free activities",
    memb_corp_row3_p: "Premium",
    memb_corp_row3_n: "10+ people",
    memb_corp_row3_b: "Increased visibility and partnership",
    memb_corp_label_org: "Organization Name",
    memb_corp_label_contact: "Contact Person",
    memb_corp_label_email: "Email",
    memb_corp_label_phone: "Phone",
    memb_corp_label_package: "Select package",
    memb_corp_btn: "Send Request",

    /* CONTACT */
    contact_title: "Contact",
    contact_sub: "Contact us for membership, cooperation or additional information.",
    contact_card_title: "Contact Details",
    contact_card_body: "Address: [sample address]<br />Email: info@mhra.mk<br />Phone: +389 2 000 000<br />Office hours: Monday – Friday, 09:00–17:00",
    contact_loc_title: "Location",
    contact_loc_box: "A map (Google Maps embed) can be embedded here in the future.",
    contact_form_title: "Send a Message",
    contact_label_name: "Full Name",
    contact_label_email: "Email",
    contact_label_subject: "Subject",
    contact_label_message: "Message",
    contact_btn_send: "Send",
  }
};

/* ========== APPLY TRANSLATIONS ========== */

function applyTranslations(lang) {
  const dict = translations[lang];
  if (!dict) return;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (!dict[key]) return;

    // Për disa elemente kemi <br />, prandaj përdor innerHTML
    el.innerHTML = dict[key];
  });
}

/* ========== UPDATE ACTIVE LANGUAGE BUTTON UI ========== */

function updateActiveLangUI(lang) {
  document.querySelectorAll("[data-lang]").forEach(btn => {
    if (btn.dataset.lang === lang) {
      btn.classList.add("nav__lang--active");
    } else {
      btn.classList.remove("nav__lang--active");
    }
  });
}
