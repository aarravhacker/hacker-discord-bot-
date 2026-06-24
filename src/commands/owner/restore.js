const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Restore bot data from backup')
    .addStringOption(opt => opt.setName('filename').setDescription('Backup filename').setRequired(true)),
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

    const filename = isSlash ? interaction.options?.getString('filename') : args[0];
    if (!filename) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a backup filename.')] });
    }

    if (isSlash) await interaction.deferReply();

    try {
      const backupPath = path.join(__dirname, '..', '..', 'backups', filename);
      if (!fs.existsSync(backupPath)) {
        const msg = { embeds: [errorEmbed('Backup file not found.')] };
        return isSlash ? interaction.editReply(msg) : interaction.reply(msg);
      }

      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      const db = getDB();
      const tables = ['users', 'guilds', 'giveaways', 'polls', 'reminders'];

      for (const table of tables) {
        if (backup[table] && backup[table].length > 0) {
          await db(table).del();
          await db(table).insert(backup[table]);
        }
      }

      const msg = { embeds: [successEmbed(`Restored from **${filename}** successfully!`)] };
      if (isSlash) {
        await interaction.editReply(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch (err) {
      console.error(err);
      const msg = { embeds: [errorEmbed('Failed to restore backup.')] };
      if (isSlash) {
        await interaction.editReply(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  }
};
