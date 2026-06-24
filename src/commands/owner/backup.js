const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Backup bot data'),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    if (user.id !== config.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
    }

    if (isSlash) await interaction.deferReply();

    try {
      const db = getDB();
      const tables = ['users', 'guilds', 'giveaways', 'polls', 'reminders'];
      const backup = {};

      for (const table of tables) {
        try {
          backup[table] = await db(table).select('*');
        } catch {
          backup[table] = [];
        }
      }

      const backupDir = path.join(__dirname, '..', '..', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const filename = `backup_${Date.now()}.json`;
      fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(backup, null, 2));

      const msg = { embeds: [successEmbed(`Backup created: **${filename}**\nTables: ${tables.join(', ')}`)] };
      if (isSlash) {
        await interaction.editReply(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch (err) {
      console.error(err);
      const msg = { embeds: [errorEmbed('Failed to create backup.')] };
      if (isSlash) {
        await interaction.editReply(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  }
};
