import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Terms() {
  const { t, i18n } = useTranslation();

  return (
    <div className="glossy-panel max-w-4xl mx-auto p-6">
      <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">&larr; {t('Home')}</Link>
      
      <div className="prose max-w-none text-[#003366]">
        {i18n.language === 'ru' ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Пользовательское соглашение и правила сервиса Animate Photo™</h1>
            
            <h2 className="text-xl font-bold mt-6 mb-2">1. Общие положения</h2>
            <p className="mb-4">
              Настоящий документ определяет условия использования веб-сервиса Animate Photo™ (далее — «Сервис»), расположенного по адресу https://animate-photo.vercel.app/™. Использование функционала Сервиса, включая создание интерактивных слайд-шоу и публикацию контента, допускается только при условии полного согласия пользователя с данными правилами.
            </p>

            <h2 className="text-xl font-bold mt-6 mb-2">2. Функционал и использование данных</h2>
            <p className="mb-2"><strong>Интерактивный редактор:</strong> Сервис предоставляет инструменты для манипуляции изображениями (изменение прозрачности, расположения, размеров, работа со слоями и фоном).</p>
            <p className="mb-2"><strong>Хранение данных:</strong> Для обеспечения работы Сервиса используется инфраструктура Firebase. Загружаемые пользователем изображения и созданные проекты сохраняются в облачной базе данных.</p>
            <p className="mb-4"><strong>Сторонние интеграции:</strong> В Сервис интегрировано API Postimages для обработки и размещения ссылок на графические файлы. Используя данные функции, пользователь также обязуется не нарушать политики сторонних провайдеров.</p>

            <h2 className="text-xl font-bold mt-6 mb-2">3. Правила публикации контента</h2>
            <p className="mb-2">Сервис придерживается политики безопасности и законности. Пользователям строго запрещено размещать, создавать или распространять материалы, содержащие:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Порнографические материалы и контент сексуального характера.</li>
              <li>Пропаганду деструктивных идей, нацизма, экстремизма и терроризма.</li>
              <li>Информацию о наркотических средствах, способах их изготовления или сбыта.</li>
              <li>Призывы к насилию, дискриминации по любому признаку или совершению противоправных действий.</li>
              <li>Материалы, нарушающие авторские права третьих лиц.</li>
            </ul>

            <h2 className="text-xl font-bold mt-6 mb-2">4. Система модерации и проверки</h2>
            <p className="mb-2">Для поддержания безопасности сообщества в Сервисе действует многоуровневая система фильтрации:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Автоматическая пре-модерация:</strong> Все публикуемые анимации проходят проверку через API Gemini.</li>
              <li><strong>Ручная проверка:</strong> В случае, если алгоритм не может однозначно классифицировать контент, анимация отправляется на рассмотрение администратору Сервиса для принятия окончательного решения о публикации.</li>
              <li><strong>Пользовательские жалобы:</strong> Любой участник может воспользоваться встроенной кнопкой «Пожаловаться», выбрав соответствующую категорию (спам, неприемлемый контент, нарушение авторских прав или «другое» с описанием причины). Администрация обязуется оперативно рассматривать данные обращения.</li>
            </ul>

            <h2 className="text-xl font-bold mt-6 mb-2">5. Ответственность сторон</h2>
            <p className="mb-2"><strong>Ответственность пользователя:</strong> Весь контент (животные, природа, мемы и иные графические объекты) добавляется пользователями самостоятельно. Пользователь несет единоличную ответственность за соответствие загружаемых им материалов законодательству.</p>
            <p className="mb-2"><strong>Отказ от ответственности:</strong> Администрация Сервиса не несет ответственности за содержание пользовательского контента, однако предпринимает все технические и организационные меры для удаления незаконных материалов.</p>
            <p className="mb-4"><strong>Авторские права:</strong> Если вы являетесь правообладателем и обнаружили, что ваш контент используется с нарушением закона, свяжитесь с администрацией через форму жалобы или официальные каналы связи для оперативного удаления материала.</p>

            <h2 className="text-xl font-bold mt-6 mb-2">6. Удаление контента и блокировка</h2>
            <p className="mb-4">Администрация оставляет за собой право без предварительного уведомления и объяснения причин удалять контент или ограничивать доступ пользователям, которые систематически нарушают установленные правила или пытаются обойти систему модерации.</p>

            <p className="text-sm text-gray-500 mt-8">Animate Photo™ © 2026. Исходный код проекта размещен на платформе GitHub.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">User Agreement and Terms of Service: Animate Photo™</h1>
            
            <h2 className="text-xl font-bold mt-6 mb-2">1. General Provisions</h2>
            <p className="mb-4">
              This document establishes the terms of use for the Animate Photo™ web service (hereinafter referred to as the "Service"), located at https://animate-photo.vercel.app/™. Access to and use of the Service's features, including the creation of interactive slideshows and content publication, is permitted only upon the user's full clinical agreement with these rules.
            </p>

            <h2 className="text-xl font-bold mt-6 mb-2">2. Functionality and Data Usage</h2>
            <p className="mb-2"><strong>Interactive Editor:</strong> The Service provides tools for image manipulation (adjusting transparency, positioning, dimensions, layering, and background customization).</p>
            <p className="mb-2"><strong>Data Storage:</strong> The Service utilizes Firebase infrastructure to ensure operational stability. User-uploaded images and created projects are stored in a cloud database.</p>
            <p className="mb-4"><strong>Third-Party Integrations:</strong> The Service integrates the Postimages API for processing and hosting links to image files. By using these features, the user also agrees to comply with the policies of these third-party providers.</p>

            <h2 className="text-xl font-bold mt-6 mb-2">3. Content Publication Rules</h2>
            <p className="mb-2">The Service maintains a strict policy regarding safety and legality. Users are strictly prohibited from posting, creating, or distributing materials containing:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Pornographic materials or content of a sexual nature.</li>
              <li>Propaganda of destructive ideas, Nazism, extremism, or terrorism.</li>
              <li>Information regarding narcotics, including methods of manufacture or distribution.</li>
              <li>Incitement to violence, discrimination of any kind, or the commission of illegal acts.</li>
              <li>Materials that infringe upon the intellectual property rights of third parties.</li>
            </ul>

            <h2 className="text-xl font-bold mt-6 mb-2">4. Moderation and Verification System</h2>
            <p className="mb-2">To maintain community safety, the Service employs a multi-level filtering system:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Automated Pre-moderation:</strong> All published animations are screened via the Gemini API.</li>
              <li><strong>Manual Review:</strong> If the algorithm cannot definitively classify the content, the animation is sent to the Service Administrator for a final publication decision.</li>
              <li><strong>User Reports:</strong> Any user may use the "Report" button to flag content under specific categories (spam, inappropriate content, copyright infringement, or "other" with a mandatory description). The administration commits to reviewing these reports promptly.</li>
            </ul>

            <h2 className="text-xl font-bold mt-6 mb-2">5. Liability</h2>
            <p className="mb-2"><strong>User Responsibility:</strong> All content (animals, nature, memes, and other graphic objects) is added by users independently. The user bears sole responsibility for ensuring their uploaded materials comply with applicable laws.</p>
            <p className="mb-2"><strong>Disclaimer:</strong> The Service Administration is not responsible for the substance of user-generated content but takes all necessary technical and organizational measures to remove illegal materials.</p>
            <p className="mb-4"><strong>Copyright:</strong> If you are a copyright holder and find that your content is being used in violation of the law, please contact the administration via the report form or official communication channels for prompt removal.</p>

            <h2 className="text-xl font-bold mt-6 mb-2">6. Content Removal and Blocking</h2>
            <p className="mb-4">The Administration reserves the right, without prior notice or explanation, to remove content or restrict access for users who systematically violate these rules or attempt to bypass the moderation system.</p>

            <p className="text-sm text-gray-500 mt-8">Animate Photo™ © 2026. Project source code is hosted on the GitHub platform.</p>
          </>
        )}
      </div>
    </div>
  );
}
