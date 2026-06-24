const { SlashCommandBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelupmessage')
    .setDescription('Set the level up message')
    .addStringOption(option =>
      option.setName('message').setDescription('Use {user}, {level}, {xp} placeholders').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['levelupmessage', 'lumsg'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const guildId = interaction.guild?.id;
    const message = interaction.options?.getString('message') || args?.join(' ');

    if (!message) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a message.')] });
    }

    try {
      await updateGuild(guildId, { level_up_message: message });

      const embed = successEmbed('Level Up Message Updated')
        .setDescription('Level up message has been updated.')
        .addField('New Message', message)
        .addField('Placeholders', '`{user}` - User mention\n`{level}` - New level\n`{xp}` - Current XP')
        .setColor(0x00FF00);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting level up message.')] });
    }
  }
};
