import { seedEditableCollection } from "./seed-editable-collection.mjs";

export const botTextBlocks = [
  {
    key: "prompt_menu_intro",
    text: `🍰 Выберите, что хотите сделать в боте!

Здесь собраны основные сценарии для кондитера: рецепты, фото, анализ и контент для соцсетей.

🍰 Создать рецепт
📸 Создать фото
🔎 Анализ десерта
📚 Карусель

Нажмите на нужную кнопку ниже. После выбора бот подскажет следующий шаг, попросит фото или ингредиенты и продолжит сценарий автоматически.

✨ Если захотите вернуться в меню, просто нажмите другую кнопку или отправьте команду /menu.`,
  },
];

export async function seedBotTextBlocks(prisma, blocks = botTextBlocks) {
  await seedEditableCollection(prisma.botTextBlock, blocks);
}
