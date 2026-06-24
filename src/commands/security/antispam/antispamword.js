const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamword')
    .setDescription('Configure word/phrase spam detection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a word/phrase to blacklist')
        .addStringOption(opt => opt.setName('word').setDescription('Word or phrase to block').setRequired(true))
        .addStringOption(opt => opt.setName('action').setDescription('Action when triggered')
          .addChoices({ name: 'Delete', value: 'delete' }, { name: 'Warn', value: 'warn' }, { name: 'Mute', value: 'mute' })))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a word/phrase from blacklist')
        .addStringOption(opt => opt.setName('word').setDescription('Word or phrase to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Show all blacklisted words/phrases'))
    .addSubcommand(sub =>
      sub.setName('clear').setDescription('Clear all blacklisted words'))
    .addSubcommand(sub =>
      sub.setName('test').setDescription('Test word detection on a message')
        .addStringOption(opt => opt.setName('message').setDescription('Message to test').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('ignore')
        .setDescription('Add channel or role to word ignore list')
        .addStringOption(opt => opt.setName('type').setDescription('Type to ignore').setRequired(true)
          .addChoices({ name: 'Channel', value: 'channel' }, { name: 'Role', value: 'role' }))
        .addStringOption(opt => opt.setName('id').setDescription('Channel/Role ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('unignore')
        .setDescription('Remove channel or role from word ignore list')
        .addStringOption(opt => opt.setName('type').setDescription('Type to remove').setRequired(true)
          .addChoices({ name: 'Channel', value: 'channel' }, { name: 'Role', value: 'role' }))
        .addStringOption(opt => opt.setName('id').setDescription('Channel/Role ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('preset')
        .setDescription('Load a word blacklist preset')
        .addStringOption(opt => opt.setName('preset').setDescription('Preset to load').setRequired(true)
          .addChoices(
            { name: 'Slurs', value: 'slurs' },
            { name: 'Profanity', value: 'profanity' },
            { name: 'Threats', value: 'threats' },
            { name: 'Discord scams', value: 'scams' }
          )))
    .addSubcommand(sub =>
      sub.setName('stats').setDescription('View word filter settings')),

  cooldown: 5,
  aliases: ['asword', 'wordfilter'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'list').toLowerCase();
    const guildData = await getGuild(interaction.guild.id);
    const config = JSON.parse(guildData.antispam_config || '{}');

    if (!config.words) {
      config.words = { blacklist: [], defaultAction: 'delete', ignoredChannels: [], ignoredRoles: [] };
    }

    if (subcommand === 'add') {
      const word = (isSlash ? interaction.options.getString('word') : args.slice(0, -1).join(' '))?.toLowerCase().trim();
      const action = isSlash ? interaction.options.getString('action') : args[args.length - 1];
      if (!word) return interaction.reply({ content: 'Provide a word or phrase to block.', ephemeral: true });
      if (config.words.blacklist.some(e => e.word === word)) return interaction.reply({ content: 'Word already blacklisted.', ephemeral: true });
      config.words.blacklist.push({ word, action: action || config.words.defaultAction });
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'word_blacklisted', type: 'antispam', details: JSON.stringify({ word }) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`Word **${word}** blacklisted with **${action || config.words.defaultAction}** action.`)] });
    }

    if (subcommand === 'remove') {
      const word = (isSlash ? interaction.options.getString('word') : args.join(' '))?.toLowerCase().trim();
      if (!word) return interaction.reply({ content: 'Provide a word to remove.', ephemeral: true });
      const before = config.words.blacklist.length;
      config.words.blacklist = config.words.blacklist.filter(e => e.word !== word);
      if (config.words.blacklist.length === before) return interaction.reply({ content: 'Word not found in blacklist.', ephemeral: true });
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Word **${word}** removed from blacklist.`)] });
    }

    if (subcommand === 'list') {
      const bl = config.words.blacklist;
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Blacklisted Words')
        .setDescription(bl.length > 0 ? bl.map(e => `\`${e.word}\` → ${e.action}`).join('\n') : 'None')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'clear') {
      config.words.blacklist = [];
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription('All blacklisted words cleared.')] });
    }

    if (subcommand === 'test') {
      const text = (isSlash ? interaction.options.getString('message') : args.join(' '))?.toLowerCase();
      if (!text) return interaction.reply({ content: 'Provide a message to test.', ephemeral: true });
      const matches = config.words.blacklist.filter(e => text.includes(e.word));
      const embed = new EmbedBuilder()
        .setColor(matches.length > 0 ? 0xff0000 : 0x00ff00)
        .setTitle('Word Detection Test')
        .setDescription(matches.length > 0
          ? `Detected **${matches.length}** blacklisted word(s):\n${matches.map(m => `\`${m.word}\` → ${m.action}`).join('\n')}`
          : 'No blacklisted words detected.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'ignore') {
      const type = isSlash ? interaction.options.getString('type') : args[0];
      const id = isSlash ? interaction.options.getString('id') : args[1];
      if (!type || !id) return interaction.reply({ content: 'Provide type and ID.', ephemeral: true });
      const list = type === 'channel' ? config.words.ignoredChannels : config.words.ignoredRoles;
      if (!list.includes(id)) list.push(id);
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Added **${id}** to word ${type} ignore list.`)] });
    }

    if (subcommand === 'unignore') {
      const type = isSlash ? interaction.options.getString('type') : args[0];
      const id = isSlash ? interaction.options.getString('id') : args[1];
      if (!type || !id) return interaction.reply({ content: 'Provide type and ID.', ephemeral: true });
      const list = type === 'channel' ? config.words.ignoredChannels : config.words.ignoredRoles;
      const idx = list.indexOf(id);
      if (idx > -1) list.splice(idx, 1);
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Removed **${id}** from word ${type} ignore list.`)] });
    }

    if (subcommand === 'preset') {
      const preset = isSlash ? interaction.options.getString('preset') : args[0];
      const presets = {
        slurs: ['slur1', 'slur2', 'slur3'],
        profanity: ['fuck', 'shit', 'damn', 'ass', 'bitch'],
        threats: ['kill you', 'death threat', 'dox', 'hack you'],
        scams: ['free nitro', 'click here', 'verify now', 'claim reward']
      };
      const words = presets[preset] || [];
      for (const word of words) {
        if (!config.words.blacklist.some(e => e.word === word)) {
          config.words.blacklist.push({ word, action: config.words.defaultAction });
        }
      }
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Loaded **${preset}** preset with **${words.length}** words.`)] });
    }

    if (subcommand === 'stats') {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Word Filter Settings')
        .addFields(
          { name: 'Blacklisted Words', value: `${config.words.blacklist.length}`, inline: true },
          { name: 'Default Action', value: config.words.defaultAction, inline: true },
          { name: 'Ignored Channels', value: `${config.words.ignoredChannels.length}`, inline: true },
          { name: 'Ignored Roles', value: `${config.words.ignoredRoles.length}`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
