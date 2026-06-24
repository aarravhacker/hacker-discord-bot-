const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcomemsg')
    .setDescription('Set the welcome message text')
    .addStringOption(opt =>
      opt.setName('message').setDescription('Welcome message text').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['welcomemessage'],
  prefix: true,
  async execute(interaction, args) {
    const message = interaction.options?.getString('message') || (args && args.join(' '));
    if (!message) {
      return interaction.reply({ embeds: [errorEmbed('No Message', 'Please provide a message.')] });
    }

    try {
      const db = getDB();
      const existing = await db('welcome').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.message = message;

      if (existing) {
        await db('welcome').where({ guild_id: interaction.guildId }).update({ config: JSON.stringify(config) });
      } else {
        await db('welcome').insert({ guild_id: interaction.guildId, enabled: true, config: JSON.stringify(config) });
      }

      const helpText = [
        'Welcome message set! Available placeholders:',
        '`{user}` - Mentions the user',
        '`{username}` - User\'s username',
        '`{server}` - Server name',
        '`{membercount}` - Member count'
      ].join('\n');

      await interaction.reply({ embeds: [successEmbed('Message Set', `Welcome message updated.\n\n${helpText}`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to set welcome message.')] });
    }
  }
};
