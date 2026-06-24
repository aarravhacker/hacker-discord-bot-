const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkdomain')
    .setDescription('Domain blacklist/whitelist management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('blacklist')
        .setDescription('Blacklist a domain')
        .addStringOption(opt => opt.setName('domain').setDescription('Domain to block (e.g. malicious.com)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('whitelist')
        .setDescription('Whitelist a domain')
        .addStringOption(opt => opt.setName('domain').setDescription('Domain to allow (e.g. youtube.com)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a domain from blacklist or whitelist')
        .addStringOption(opt => opt.setName('domain').setDescription('Domain to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Show all blacklisted and whitelisted domains'))
    .addSubcommand(sub =>
      sub.setName('clear').setDescription('Clear all custom domain rules'))
    .addSubcommand(sub =>
      sub.setName('preset')
        .setDescription('Load a preset domain list')
        .addStringOption(opt => opt.setName('preset').setDescription('Preset to load').setRequired(true)
          .addChoices(
            { name: 'Gaming (block game scam sites)', value: 'gaming' },
            { name: 'Phishing (block known phishing domains)', value: 'phishing' },
            { name: 'NSFW (block adult content)', value: 'nsfw' },
            { name: 'Social (block social media links)', value: 'social' },
            { name: 'Custom (empty list)', value: 'custom' }
          ))),

  cooldown: 5,
  aliases: ['aldomain', 'domainfilter'],
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
    const config = JSON.parse(guildData.antilink_config || '{}');
    if (!config.blacklistedDomains) config.blacklistedDomains = [];
    if (!config.whitelistedDomains) config.whitelistedDomains = [];

    if (subcommand === 'blacklist') {
      const domain = (isSlash ? interaction.options.getString('domain') : args[0])?.toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '');
      if (!domain) return interaction.reply({ content: 'Provide a domain to block.', ephemeral: true });
      if (config.whitelistedDomains.includes(domain)) return interaction.reply({ content: 'This domain is whitelisted. Remove it first.', ephemeral: true });
      if (!config.blacklistedDomains.includes(domain)) config.blacklistedDomains.push(domain);
      config.blockUrls = true;
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'domain_blacklisted', type: 'antilink', details: JSON.stringify({ domain }) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`Domain **${domain}** blacklisted. All messages containing this domain will be deleted.`)] });
    }

    if (subcommand === 'whitelist') {
      const domain = (isSlash ? interaction.options.getString('domain') : args[0])?.toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '');
      if (!domain) return interaction.reply({ content: 'Provide a domain to allow.', ephemeral: true });
      if (config.blacklistedDomains.includes(domain)) config.blacklistedDomains = config.blacklistedDomains.filter(d => d !== domain);
      if (!config.whitelistedDomains.includes(domain)) config.whitelistedDomains.push(domain);
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Domain **${domain}** whitelisted. Messages with this domain will be allowed.`)] });
    }

    if (subcommand === 'remove') {
      const domain = (isSlash ? interaction.options.getString('domain') : args[0])?.toLowerCase();
      if (!domain) return interaction.reply({ content: 'Provide a domain to remove.', ephemeral: true });
      config.blacklistedDomains = config.blacklistedDomains.filter(d => d !== domain);
      config.whitelistedDomains = config.whitelistedDomains.filter(d => d !== domain);
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Domain **${domain}** removed from all lists.`)] });
    }

    if (subcommand === 'list') {
      const bl = config.blacklistedDomains || [];
      const wl = config.whitelistedDomains || [];
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Domain Rules')
        .addFields(
          { name: `Blacklisted (${bl.length})`, value: bl.length > 0 ? bl.map(d => `\`${d}\``).join(', ') : 'None', inline: false },
          { name: `Whitelisted (${wl.length})`, value: wl.length > 0 ? wl.map(d => `\`${d}\``).join(', ') : 'None', inline: false }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'clear') {
      config.blacklistedDomains = [];
      config.whitelistedDomains = [];
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription('All custom domain rules cleared.')] });
    }

    if (subcommand === 'preset') {
      const preset = isSlash ? interaction.options.getString('preset') : args[0];
      const presets = {
        gaming: ['free-nitro.com', 'discord-games.xyz', 'nitro-giveaway.tk', 'free-boost.ml', 'discord-rewards.ga'],
        phishing: ['discord-login.com', 'discord-verify.net', 'discordapp.xyz', 'discord-gg.ml', 'discord-free.com', 'claim-nitro.com'],
        nsfw: ['pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com', 'youporn.com'],
        social: ['tiktok.com', 'instagram.com', 'facebook.com', 'twitter.com', 'snapchat.com'],
        custom: []
      };
      config.blacklistedDomains = presets[preset] || [];
      config.whitelistedDomains = [];
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Loaded **${preset}** preset with **${config.blacklistedDomains.length}** domains.`)] });
    }
  }
};
