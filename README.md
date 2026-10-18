<p align="center">
  <img src="https://img.shields.io/badge/Obsidian-Plugin-7C3AED?style=for-the-badge&logo=obsidian&logoColor=white" alt="Obsidian Plugin">
  <img src="https://img.shields.io/badge/Version-0.5.0-5B6DCD?style=for-the-badge" alt="Version 0.5.0">
  <img src="https://img.shields.io/badge/Status-Experimental-E09F3E?style=for-the-badge" alt="Experimental">
  <img src="https://img.shields.io/badge/Platform-Desktop%20%26%20Mobile-475569?style=for-the-badge" alt="Desktop and mobile target">
</p>

<h1 align="center">Canvsidian</h1>

<p align="center">
  <strong>JAM-inspired spatial tools for your existing Obsidian notes.</strong><br>
  Select, move, edit, annotate, and draw — without creating a separate canvas or note.
</p>

<p align="center" dir="rtl">
  <strong>ابزارهای فضایی با الهام از JAM برای نوت‌های موجود در Obsidian.</strong><br>
  بلاک‌ها را انتخاب، جابه‌جا و ویرایش کنید و در همان نوت ترسیم و annotation اضافه کنید؛ بدون ساخت Canvas یا نوت جداگانه.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#ارتقا-یا-نصب">Installation</a> ·
  <a href="#انتخاب-و-چیدمان">Usage</a> ·
  <a href="#محدودیتهای-مهم">Limitations</a> ·
  <a href="#license">License</a>
</p>

---

## Overview

Canvsidian is an experimental Obsidian community plugin that adds JAM-inspired spatial editing tools to the **current Markdown note**. It lets you float existing Markdown blocks, move and resize them, draw vector shapes, and add sticky notes, labels, stickers, images, and native Obsidian icons in the same editor.

It does not create a new note, Canvas file, or workspace view. The layout and annotations are stored in the plugin's `data.json`; the original Markdown remains in the note unless you explicitly edit or delete a block.

> **Experimental:** Tests use real CodeMirror with a simulated host/renderer. Running this version inside the Obsidian app has not yet been verified. Back up your vault and `data.json`, then test in a disposable vault. QA screenshots are not captures from a live Obsidian session.

## Features

- Float and reposition existing top-level Markdown blocks in Live Preview.
- Edit or return blocks to normal text flow in the same note.
- Draw vector strokes, shapes, lines, and arrows.
- Add sticky notes, labels, stickers, tape, imported images, and native Obsidian icons.
- Resize and rotate supported objects; configure tool appearance from contextual controls.
- Preserve note text when changing layout or resetting spatial effects.
- Keep layout metadata and annotations local to the vault.

**Current version:** 0.5.0 · **Minimum Obsidian version:** 1.8.0 · **Status:** Experimental

---

## ارتقا یا نصب

پوشهٔ `canvesidian` داخل ZIP را در `.obsidian/plugins/` استخراج کنید. برای ارتقا، **فقط سه فایل زیر را جایگزین کنید**؛ `data.json` قبلی را حذف نکنید:

```text
YourVault/.obsidian/plugins/canvesidian/
├── main.js
├── manifest.json
├── styles.css
└── data.json   ← دادهٔ شخصی؛ از نسخهٔ خودتان نگه دارید
```

Obsidian را reload و پلاگین را فعال کنید. اجرای پلاگین محلی به خاموش‌بودن Restricted mode نیاز دارد؛ فقط کدی را نصب کنید که به آن اعتماد دارید. هدف manifest نسخهٔ 1.8+ است، نه ادعای تأیید روی تمام نسخه‌ها.

دادهٔ v0.2، v0.3 و v0.4 به schema 5 مهاجرت می‌کند؛ جای بلاک‌ها حفظ می‌شود. بوردهای v0.1 زیر `legacyBoards` نگه داشته می‌شوند، اما نمایش یا تبدیل نمی‌شوند. **برای downgrade بک‌آپ دادهٔ نسخهٔ قبلی لازم است.**

## تازه در ۰.۵ — چیدمان، چسب واقعی و کنترل افکت‌ها

۱. **دستگیرهٔ چپ:** دستگیرهٔ نوت با محدودهٔ واقعی glyphها تراز می‌شود، نه شروع منطقی خط؛ متن و تیتر RTL دستگیره را به سمت راست نمی‌برند. آبجکت‌های شناور هم دستگیرهٔ سمت چپ دارند.
۲. **Rotation:** چرخش متن، شکل، عکس، استیکر و annotation با دستگیرهٔ گرد و مقدار عددی در تنظیمات. Shift هنگام drag زاویه را روی گام‌های ۱۵ درجه snap می‌کند. نوار ابزار نمی‌چرخد؛ کادر و دستگیره‌ها با خود آبجکت می‌چرخند. preview درگ و چرخش DOM-only است.
۳. **Tool settings:** با Select، تنظیمات آبجکت انتخاب‌شده باز می‌شود؛ برای بلاک Markdown عرض و چرخش، برای annotation ظاهر و چرخش. بدون انتخاب آبجکت، پنجرهٔ تنظیمات عمومی باز می‌شود؛ دیگر بی‌واکنش نیست.
۴. **چسب / Washi:** چسب رنگی با لبه‌های دندانه‌ای، نه sticky note. از Draw tools به‌صورت آزاد یا از دکمهٔ `Add tape to sticky` در نوار استیکی اضافه می‌شود. چسب متصل، حرکت و چرخش استیکی را دنبال می‌کند؛ drag خود چسب، آن را از والد جدا می‌کند.
۵. **گروه‌بندی:** Draw tools؛ Shapes and lines؛ Notes and labels؛ Stickers؛ Images and icons. تنظیمات در پنل بالای dock هستند، نه ده‌ها آیکون هم‌سطح.
۶. **عکس از سیستم:** Images and icons → Import image from computer. PNG/JPEG/GIF/WebP حداکثر ۲۰MB پذیرفته می‌شود. تصویر در پوشهٔ attachment تنظیم‌شدهٔ vault کپی و در همین نوت جای‌گذاری می‌شود. SVG/HTML پذیرفته نمی‌شود. حذف annotation یا reset، فایل attachment را از vault حذف نمی‌کند. عکس واردشده در Markdown embed نمی‌شود.
۷. **آیکون بومی:** Images and icons → Add Obsidian icon. جست‌وجو در خروجی واقعی `getIconIds()`؛ انتخاب، تغییر رنگ، اندازه و چرخش. برای سبک‌بودن، حداکثر ۶۰ نتیجه هم‌زمان نمایش داده می‌شود؛ با جست‌وجوی دقیق‌تر بقیه پیدا می‌شوند.
۸. **تنظیمات پلاگین:** تب رسمی Canvesidian در تنظیمات Obsidian و آیکون Plugin settings در dock؛ پس‌زمینهٔ نقطه‌ای، فاصله و opacity نقطه‌ها. تنظیمات grid عمومی‌اند اما فقط روی نوت‌هایی نمایش داده می‌شوند که افکت‌هایشان روشن است.
۹. **Toggle note effects:** غیرمخرب و مخصوص همین نوت؛ با خاموش‌کردن، متن به جریان عادی برمی‌گردد و annotationها، grid و کادرها پنهان می‌شوند. مختصات، نوشته‌ها و فایل‌ها حفظ می‌شوند. دکمهٔ روشن‌کردن همچنان در dock کوچک باقی می‌ماند. این کار با **Reset** که پس از تأیید دادهٔ چیدمان را پاک می‌کند فرق دارد.

موارد بیشتر با الهام از JAM: مثلث، annotation متن آزاد، section قاب‌دار، جدول محلی و باکس کد و Duplicate object. جدول با متن TSV (ستون‌ها با Tab و ردیف‌ها با newline) ویرایش می‌شود و تا ۱۶×۱۶ سلول نمایش می‌دهد. کد در این نسخه متن monospace است، نه IDE یا syntax-highlighter. section ناحیهٔ بصری است، نه کانتینر گروه‌بندی فرزندان.

**این نسخه هم‌ارزی کامل NGIN JAM ندارد:** اتصال پویا به اشیا، انتخاب گروهی، collaboration/comment thread، فشار قلم، پاک‌کن، pan/zoom اختصاصی و خروجی تصویری هنوز وجود ندارند. چسب به استیکی وصل می‌شود؛ سایر annotationها به مختصات نوت وصل‌اند، نه معنای یک پاراگراف Markdown.

## تازه در ۰.۴ — ابزارها با الهام از NGIN JAM

- ترتیب نوار ابزار همیشه **LTR** است؛ متن فارسی یا راست‌به‌چپ بودن ادیتور، ترتیب آیکون‌ها را برعکس نمی‌کند. محتوای استیکی‌نوت و برچسب `dir=auto` دارد.
- انتخاب هر ابزار، پنل تنظیمات همان ابزار را **بالای dock** باز می‌کند. کلیک دوباره پنل را می‌بندد و ابزار را نگه می‌دارد. تنظیمات ابزار انتخاب‌شده از آیکون sliders هم باز می‌شود.
- قلم و هایلایتر، رنگ، اندازهٔ ۱–۳۲px و opacity مستقل دارند؛ رنگ سفارشی هم ممکن است. این پیش‌فرض‌ها در `data.json` می‌مانند و بعد از بازکردن مجدد برمی‌گردند.
- مستطیل، بیضی و لوزی: رنگ خط، ضخامت و fill؛ خط و فلش: رنگ و ضخامت. فلش جهت حرکت drag را نگه می‌دارد.
- **Sticky note:** رنگ کاغذ، رنگ و سایز متن؛ با کلیک روی فضا اضافه و در همان‌جا ویرایش می‌شود. ذخیره با تیک یا Ctrl/Cmd+Enter، لغو با × یا Escape. برای ویرایش مجدد دوبارکلیک کنید یا آیکون ویرایش را بزنید.
- **Label:** برچسب متنی قابل‌ویرایش با پس‌زمینهٔ رنگی و گوشه‌های گرد؛ مستقل از متن Markdown.
- **Stickers:** هشت مُهر برداری محلی: ستاره، قلب، لایک، تیک، ایده، سؤال، شعله و sparkles. انتخاب از پنل؛ کلیک برای جایگذاری؛ جابه‌جایی و تغییر اندازه مثل شکل‌ها.
- آیکون **Object appearance** در نوار آبجکت انتخاب‌شده برای تغییر رنگ/اندازه/شفافیت یا نوع استیکر است.
- **مهم:** استیکی‌نوت، برچسب و استیکر، annotation فضایی در دادهٔ پلاگین‌اند، نه متن جدید داخل `.md`. با غیرفعال‌کردن افزونه در Markdown دیده نمی‌شوند. همراه vault از `data.json` بک‌آپ و sync بگیرید. ریست آن‌ها را هم حذف می‌کند؛ drawing undo در همان نشست قابل برگشت است.
- پیش‌نویس ذخیره‌نشدهٔ annotation هنگام بسته‌شدن ادیتور در فرمان `Recover interrupted block drafts` حفظ می‌شود.

رفرنس رفتاری: [NGIN JamToolbar](https://github.com/Ali-Nourix/NGIN/blob/main/src/ui/panels/JamToolbar.tsx) و [tool defaults](https://github.com/Ali-Nourix/NGIN/blob/main/src/core/jam/tools.ts). این پیاده‌سازی مستقل و بر پایهٔ DOM/SVG و آیکون بومی Obsidian است؛ موتور یا کد React پروژهٔ NGIN وارد نشده است.

## انتخاب و چیدمان

۱. یک نوت موجود را در **Live Preview** باز کنید.
۲. با دستگیرهٔ کنار پاراگراف، بلاک را از جریان متن بیرون بکشید؛ یا مکان‌نما را داخل بلاک بگذارید و فرمان `Canvesidian: Float this block in the current note` را اجرا کنید. منوی راست‌کلیک هم همین گزینه را دارد.
۳. کلیک روی آبجکت، کادر آبی و دستگیره‌ها را نشان می‌دهد. فقط **آبجکت انتخاب‌شده** نوار ابزار دارد، نه همهٔ بلاک‌ها هنگام hover.
۴. متن رندرشده را از خودِ بدنه یا آیکون جابه‌جایی بکشید. کلیدهای جهت ۱ پیکسل و Shift+جهت ۱۰ پیکسل حرکت می‌دهند.
۵. نوار ابزار **بیرون و بالای محدودهٔ آبجکت** قرار دارد؛ نزدیک لبهٔ viewport جایش محدود می‌شود. وقتی آبجکت کاملاً خارج viewport باشد، نوارش پنهان می‌شود.

آیکون‌ها با `setIcon` بومی Obsidian ساخته می‌شوند؛ همان خانوادهٔ Lucide که در Task Pro هم استفاده شده است. ظاهر خنثی، حاشیهٔ ظریف و تم میزبان، به‌جای کارت‌های دائمی یا تولبار متنیِ داخل محتوا استفاده شده‌اند.

### ابزارهای متن انتخاب‌شده

- **Move:** جابه‌جایی آبجکت؛ drag از بدنه هم ممکن است.
- **Edit / Done:** ویرایش Markdown در همان محل؛ نوشتن از طریق transaction به **همان سند اصلی** می‌رود. دکمهٔ Done اکنون آیکون تیک در نوار بالاست، نه پنجره یا footer جدا.
- **Return:** فقط به جریان متن عادی برمی‌گرداند؛ متن و ترتیب منبع را تغییر نمی‌دهد.
- **Delete:** با تأیید، **Markdown همان بلاک را از نوت حذف می‌کند**. با undo متن در ویرایشگر می‌توان آن را برگرداند؛ چیدمان حذف‌شده خودکار برنمی‌گردد.
- دستگیره‌های متن عرض را تغییر می‌دهند؛ ارتفاع با متن تنظیم می‌شود. قاب شکل‌های برداری در هر دو بعد قابل resize است. چرخش از دستگیرهٔ گرد یا تنظیمات قابل کنترل است.

برای دیدن Markdown عادی، به Source mode بروید یا فرمان `Canvesidian: Show / hide spatial layout in this note` را اجرا کنید. Reading View و PDF export هنوز چیدمان فضایی را نشان نمی‌دهند.

## پالت ترسیم در پایین همان ویرایشگر

| ابزار | رفتار |
| --- | --- |
| Select | انتخاب و جابه‌جایی آبجکت‌های موجود |
| Pen | قلم آزاد برداری با نقاط نرمال‌شده |
| Highlighter | براش ضخیم نیمه‌شفاف |
| Rectangle | مستطیل |
| Ellipse | بیضی/دایره |
| Line / Arrow / Diamond | خط، فلش و لوزی |
| Sticky / Label / Sticker | یادداشت چسبان، برچسب متنی، استیکر |
| Undo / Redo | تاریخچهٔ **ترسیم‌ها** در همین نشست و همین نوت |
| Reset | ریست چیدمان کل نوت، پس از تأیید |

ابزار را انتخاب کنید و داخل فضای نوت بکشید. رنگ و ضخامت ترسیم انتخاب‌شده از نوار بالای خودش تغییر می‌کنند. قلم و هایلایتر همچنان ابزار فعال می‌مانند تا بتوانید چند stroke بکشید؛ برای جابه‌جایی بدنهٔ شکل‌ها، Select را بزنید. در حالت ترسیم نیز نوار ابزار آبجکت انتخاب‌شده قابل استفاده است.

- خط و شکل و stroke، SVG سبک هستند؛ وابستگی به Excalidraw یا سرویس خارجی ندارند.
- حذف ترسیم، متن نوت را تغییر نمی‌دهد. Undo/Redo پالت فقط ترسیم‌ها را برمی‌گرداند؛ جای بلاک متن یا حذف متن را undo نمی‌کند.
- `Ctrl/Cmd+Z` روی ترسیم یا پالت به تاریخچهٔ ترسیم می‌رود؛ داخل textarea ویرایش متن به تاریخچهٔ سند اصلی می‌رود.
- Escape ژست ترسیم فعال را لغو و ابزار را به Select برمی‌گرداند. pointercancel و از‌دست‌رفتن focus حین drag، پیش‌نمایش جابه‌جایی را به جای قبلی برمی‌گردانند.
- براش فشار قلم، پاک‌کن ناحیه‌ای، برچسب داخل شکل، گروه‌بندی، چندانتخابی، اتصال پویا و export تصویری هنوز پیاده نشده‌اند. این نسخه یک ادیتور کامل NGIN/FigJam نیست.

### ریست کل نوت دقیقاً چه می‌کند؟

`Reset entire note layout` پس از تأیید:

- همهٔ بلاک‌های شناور را در **همین نوت** به جریان متن معمولی برمی‌گرداند؛
- چیدمان‌های جداشده و همهٔ ترسیم‌ها، استیکی‌نوت‌ها، برچسب‌ها و استیکرهای همین نوت را پاک می‌کند؛
- **هیچ بایتی از متن Markdown را حذف نمی‌کند** و به چیدمان نوت‌های دیگر دست نمی‌زند؛
- نسخه‌های بازیابیِ پیش‌نویس را حذف نمی‌کند.

Undo ترسیم می‌تواند ترسیم‌های قبل از reset را در همان نشست برگرداند؛ جای بلاک‌های متن با آن برنمی‌گردد. حذف واقعی متن فقط از دکمهٔ Delete خودِ بلاک و با تأیید انجام می‌شود.

## چه چیزی برای کندی عوض شده؟

- pointermove دیگر CodeMirror transaction، rebuild دکوریشن یا ذخیرهٔ داده اجرا نمی‌کند.
- حرکت فقط یک preview با `requestAnimationFrame` و transform است؛ ثبت نهایی پس از رهاکردن انجام می‌شود. هنگام resize عرض به‌صورت پیش‌نمایش تغییر می‌کند؛ ارتفاع متن فقط در پایان/از ResizeObserver ثبت می‌شود.
- وضعیت ویرایشگر برای selectionهای نامرتبط دوباره ساخته نمی‌شود؛ دکوریشن‌ها فقط وقتی بازه‌های متن یا محدودهٔ رزروشدهٔ اسکرول عوض شوند بازسازی می‌شوند.
- متن و anchorها cache می‌شوند؛ هندسهٔ جدید باعث stringify دوبارهٔ کل سند یا render دوبارهٔ Markdown نمی‌شود.
- hover حداکثر یک‌بار در فریم محاسبه می‌شود و هنگام drag معلق است.

تست مصنوعی با یک بلاک، overhead مربوط به transaction را بررسی کرده، **نه FPS یا سرعت کلی Obsidian**. روش و دادهٔ خام در [docs/PERFORMANCE.md](docs/PERFORMANCE.md) آمده‌اند. هنوز ادعای performance روی vault بزرگ، تمام تم‌ها یا افزونه‌های دیگر نداریم.

## داده، اتصال به متن و حفاظت از نوشته

- متن در همان فایل `.md` می‌ماند. فقط ویرایش و حذفِ تأییدشدهٔ متن آن را تغییر می‌دهند؛ جابه‌جایی، ترسیم و reset، فایل اصلی را بازنویسی نمی‌کنند.
- مختصات، SVG geometry و پیش‌نویس‌های بازیابی در `.obsidian/plugins/canvesidian/data.json` ذخیره می‌شوند. برای بک‌آپ یا sync، این فایل را هم در نظر بگیرید.
- واحد فعلی، بلاک سطح اول Markdown است: پاراگراف، تیتر، تصویر مستقل، fenced code، لیست کامل، نقل‌قول یا جدول GFM. انتخاب کلمه، سلول جدول یا آیتم لیست تو‌در‌تو پیاده نشده؛ Frontmatter جدا نمی‌شود.
- بازه‌ها با transactionهای متن map می‌شوند. برای بازکردن مجدد، متن دقیق و زمینهٔ اطراف آن به‌کار می‌رود؛ هنوز شناسهٔ معنایی دائمی نیست. تطبیق مبهم/تغییریافته پنهان نمی‌شود و دادهٔ placement نگه داشته می‌شود.
- فارسی و composition: متن نیمه‌کاره تا `compositionend` dispatch نمی‌شود. اگر منبع در این فاصله تغییر کند، پیش‌نویس روی آن نوشته نمی‌شود. پیش‌نویسِ اعمال‌نشده هنگام بسته‌شدن بلاک در `recoveryDrafts` نگه داشته می‌شود؛ فرمان `Canvesidian: Recover interrupted block drafts` پنجرهٔ فقط‌خواندنی برای کپی باز می‌کند، نه نوت جدید.
- ذخیرهٔ چیدمان debounce دارد؛ crash یا شکست ذخیره می‌تواند آخرین تغییرات را از بین ببرد. حفاظت از پیش‌نویس، جای بک‌آپ نیست.
- کد analytics یا درخواست شبکه ندارد. MarkdownRenderer و افزونه‌های دیگر رفتار مستقل خودشان را دارند.

## محدودیت‌های مهم

- داخل اپ واقعی Obsidian هنوز تست نشده است؛ مخصوصاً ترکیب decorationها با Live Preview، تصویر/Embed واقعی، callout، folding، فایل rename و viewport virtualization.
- ویرایش در محل textarea با Markdown خام است، نه Live Preview دوم؛ autocomplete و تمام commandهای افزونه‌ها در آن تضمین نشده‌اند.
- آزادی هم‌پوشانی عمداً وجود دارد. باکس متن خودکار از شکل یا متن دیگر فاصله نمی‌گیرد. جای‌گذاری واکنش‌گرا یا canvas واقعاً بی‌نهایت نیست.
- مختصات مثبت تا ۵۰٬۰۰۰ پیکسل، عرض متن ۲۰۰ تا ۱۲۰۰، هندسهٔ ترسیم ذخیره‌شده تا ۱۰٬۰۰۰ پیکسل در هر بعد و stroke حداکثر ۵٬۰۰۰ نقطه محدودند.
- زوم، پَن اختصاصی، انتخاب چندتایی، ایجاد بلاک Markdown از فضای خالی (annotation متنی ممکن است) و undo جامعِ چیدمان/متن/ترسیم هنوز وجود ندارند.
- چند pane یا چند دستگاه، merge زندهٔ چیدمان ندارند؛ دادهٔ ذخیره‌شده می‌تواند last-writer-wins باشد.
- viewport باریک و coarse pointer در Chromium بررسی شده‌اند، نه لمس/IME روی گوشی واقعی یا tablet قلم‌دار.

## توسعه و تست

```sh
npm ci
npm run check
npm exec -- playwright install chromium
npm run test:ui
npm run benchmark
# Optional system Chromium:
CHROMIUM_PATH=/path/to/chromium npm run test:ui
```

- `src/spatial.ts`: اتصال به ویرایشگر فعلی، بازه‌های متن و نگهداری چیدمان.
- `src/interaction.ts`: preview یک‌فریم، selection chrome و ابزارهای آیکونی.
- `src/design-tools.ts`: ترسیم‌ها، پالت، property tools، undo/redo و تأیید reset/delete.
- `src/model.ts`: parser، تطبیق محافظه‌کارانه، هندسه و مهاجرت schema 2/3/4 به 5 و نگهداری بوردهای قدیمی v1.
- **۴۵ تست مدل** و **۷۶ بررسی تعامل** در Chromium؛ موتور CodeMirror واقعی، API میزبان و MarkdownRenderer شبیه‌سازی‌شده‌اند. تصاویر harness رندر واقعی Live Preview ابسیدین نیستند.
- CodeMirror در build تولیدی external است تا state/view دوم در Obsidian bundle نشود. خروجی آمادهٔ نصب `main.js` همراه ریپو نگه داشته می‌شود.

پیش از انتشار نهایی: نصب در Obsidian واقعی، تم روشن/تیره، تصاویر/Embedها، نوت بزرگ، افزونه‌های دیگر، restart، rename، sync و IME/لمس واقعی باید دستی تست شوند.
