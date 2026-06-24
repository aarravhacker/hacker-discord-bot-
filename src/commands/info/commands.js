const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/helpers');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commands')
    .setDescription('List all available commands')
    .addStringOption(opt =>
      opt.setName('category').setDescription('Category to list').setRequired(false)
    ),
  cooldown: 5,
  aliases: ['cmds', 'cmdlist'],
  prefix: true,
  async execute(interaction, args) {
    const category = args?.[0] || interaction.options?.getString('category');
    const commandsDir = path.join(__dirname, '..');

    if (category) {
      const catDir = path.join(commandsDir, category);
      if (!fs.existsSync(catDir)) {
        return interaction.reply({ embeds: [createEmbed(`⚠️ Category \`${category}\` not found.`, 'warning')] });
      }

      const commands = fs.readdirSync(catDir)
        .filter(f => f.endsWith('.js'))
        .map(f => {
          try {
            const cmd = require(path.join(catDir, f));
            return `\`${cmd.data.name}\` - ${cmd.data.description}`;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const embed = new EmbedBuilder()
        .setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
        .setDescription(commands.join('\n') || 'No commands found.')
        .setColor(config.embedColors?.info || 0x0099ff);

      return interaction.reply({ embeds: [embed] });
    }

    const categories = {};
    const categories_list = fs.readdirSync(commandsDir).filter(f =>
      fs.statSync(path.join(commandsDir, f)).isDirectory()
    );

    for (const cat of categories_list) {
      const cmds = fs.readdirSync(path.join(commandsDir, cat))
        .filter(f => f.endsWith('.js'))
        .map(f => {
          try {
            const cmd = require(path.join(commandsDir, cat, f));
            return cmd.data.name;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (cmds.length > 0) {
        categories[cat] = cmds;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 All Commands')
      .setColor(config.embedColors?.info || 0x0099ff)
      .setDescription('Use `/commands <category>` to filter by category.');

    for (const [cat, cmds] of Object.entries(categories)) {
      embed.addFields({
        name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${cmds.length})`,
        value: cmds.map(c => `\`${c}\``).join(', '),
        inline: false
      });
    }

    interaction.reply({ embeds: [embed] });
  }
};
