const { SlashCommandBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelcard')
    .setDescription('Customize your level card appearance')
    .addStringOption(option =>
      option.setName('color').setDescription('Hex color for the card (e.g., #5865F2)')
    )
    .addStringOption(option =>
      option.setName('background').setDescription('Background URL for the card')
    ),
  cooldown: 10,
  aliases: ['levelcard'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    const guildId = interaction.guild?.id;
    const userId = user.id;
    const color = interaction.options?.getString('color');
    const background = interaction.options?.getString('background');

    try {
      const guild = await getGuild(guildId);
      const levelCards = guild.level_cards || {};
      const userCard = levelCards[userId] || {};

      if (color) {
        const hexColor = color.replace('#', '');
        if (!/^[0-9A-Fa-f]{6}$/.test(hexColor)) {
          return interaction.reply({ embeds: [errorEmbed('Invalid hex color format. Use #RRGGBB.')] });
        }
        userCard.color = `#${hexColor}`;
      }

      if (background) {
        if (!background.startsWith('http')) {
          return interaction.reply({ embeds: [errorEmbed('Please provide a valid URL.')] });
        }
        userCard.background = background;
      }

      if (!color && !background) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a color or background.')] });
      }

      levelCards[userId] = userCard;
      await updateGuild(guildId, { level_cards: levelCards });

      const embed = successEmbed('Level Card Updated')
        .setDescription('Your level card has been customized!')
        .setColor(0x00FF00);

      if (color) embed.addField('Color', color, true);
      if (background) embed.addField('Background', 'Updated', true);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while updating level card.')] });
    }
  }
};
