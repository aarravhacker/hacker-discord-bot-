const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

const VAULT_FILE = path.join(__dirname, '..', '..', '..', 'vault.json');

function loadVault() {
  try {
    if (fs.existsSync(VAULT_FILE)) {
      return JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
    }
  } catch (e) {}
  return { items: [], notes: [] };
}

function saveVault(data) {
  fs.writeFileSync(VAULT_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vault')
    .setDescription('Hidden owner storage')
    .addStringOption(opt => opt.setName('action').setDescription('Action: add, list, remove, note').setRequired(true))
    .addStringOption(opt => opt.setName('key').setDescription('Key/name'))
    .addStringOption(opt => opt.setName('value').setDescription('Value/content')),
  cooldown: 0,
  aliases: ['vl'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== config.ownerId) return;

    const action = isSlash ? interaction.options?.getString('action') : args?.[0];
    const key = isSlash ? interaction.options?.getString('key') : args?.[1];
    const value = isSlash ? interaction.options?.getString('value') : args?.slice(2).join(' ');

    const vault = loadVault();

    if (action === 'add') {
      if (!key || !value) return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('Missing Args').setDescription('Usage: `!vault add <key> <value>`')
      ] });
      vault.items.push({ key, value, added: Date.now() });
      saveVault(vault);
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x00ff00).setTitle('Item Stored').setDescription(`**${key}** saved to vault.`).setTimestamp()
      ] });
    }

    if (action === 'list') {
      if (!vault.items.length && !vault.notes.length) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setColor(0x5865f2).setTitle('Vault Empty').setDescription('No items stored yet.')
        ] });
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Vault Contents')
        .setTimestamp();

      if (vault.items.length) {
        embed.addFields({ name: 'Items', value: vault.items.map(i => `\`${i.key}\`: ${i.value.substring(0, 100)}`).join('\n') });
      }
      if (vault.notes.length) {
        embed.addFields({ name: 'Notes', value: vault.notes.map((n, i) => `\`${i + 1}\`: ${n.content.substring(0, 100)}`).join('\n') });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'remove') {
      if (!key) return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('Missing Key').setDescription('Usage: `!vault remove <key>`')
      ] });
      const idx = vault.items.findIndex(i => i.key === key);
      if (idx === -1) return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('Not Found').setDescription(`No item with key \`${key}\``)
      ] });
      vault.items.splice(idx, 1);
      saveVault(vault);
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x00ff00).setTitle('Removed').setDescription(`\`${key}\` removed from vault.`)
      ] });
    }

    if (action === 'note') {
      const content = value || key;
      if (!content) return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0xff0000).setTitle('Missing Content').setDescription('Usage: `!vault note <content>`')
      ] });
      vault.notes.push({ content, added: Date.now() });
      saveVault(vault);
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(0x00ff00).setTitle('Note Saved').setDescription('Note added to vault.').setTimestamp()
      ] });
    }

    return interaction.reply({ embeds: [
      new EmbedBuilder().setColor(0xff0000).setTitle('Invalid Action').setDescription('Use: `add`, `list`, `remove`, `note`')
    ] });
  }
};
