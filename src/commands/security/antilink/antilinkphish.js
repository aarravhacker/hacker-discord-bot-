const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkphish')
    .setDescription('Advanced phishing detection and prevention')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable phishing detection'))
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable phishing detection'))
    .addSubcommand(sub =>
      sub.setName('scan').setDescription('Scan recent messages for phishing links'))
    .addSubcommand(sub =>
      sub.setName('addpattern')
        .setDescription('Add a phishing pattern to detect')
        .addStringOption(opt => opt.setName('pattern').setDescription('Regex pattern to match').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('removepattern')
        .setDescription('Remove a phishing pattern')
        .addStringOption(opt => opt.setName('pattern').setDescription('Pattern to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('patterns').setDescription('View all phishing patterns'))
    .addSubcommand(sub =>
      sub.setName('report').setDescription('Generate phishing threat report')),

  cooldown: 5,
  aliases: ['alphish', 'phishguard'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'status').toLowerCase();
    const guildData = await getGuild(interaction.guild.id);
    const config = JSON.parse(guildData.antilink_config || '{}');

    if (subcommand === 'enable') {
      config.phishingDetection = true;
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription('Phishing detection enabled. Messages with known phishing patterns will be blocked.')] });
    }

    if (subcommand === 'disable') {
      config.phishingDetection = false;
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Phishing detection disabled.')] });
    }

    if (subcommand === 'scan') {
      await interaction.deferReply();
      const channel = interaction.channel;
      const phishingPatterns = [
        /discord\.(gg|com)\/(nitro|free|gift|airdrop|boost)/gi,
        /(?:free|cheap|buy|sell)\s*(nitro|discord|boost)/gi,
        /claim.*(?:nitro|reward|gift)/gi,
        /verify.*(?:account|identity)/gi,
        /steamcommunity\.com\/(id|profiles)\/[a-z]+\/tradeoffer/gi,
        /(?:token|grab|steal|ip|dox)/gi
      ];

      let scanned = 0;
      let phishingFound = 0;
      const found = [];

      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        for (const [, msg] of messages) {
          if (msg.author.bot) continue;
          scanned++;
          for (const pattern of phishingPatterns) {
            pattern.lastIndex = 0;
            if (pattern.test(msg.content)) {
              phishingFound++;
              found.push({ user: msg.author.tag, content: msg.content.substring(0, 100), url: msg.url });
              break;
            }
          }
        }
      } catch (e) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`Error scanning: ${e.message}`)] });
      }

      const embed = new EmbedBuilder()
        .setColor(phishingFound > 0 ? 0xff0000 : 0x00ff00)
        .setTitle('Phishing Scan Results')
        .addFields(
          { name: 'Messages Scanned', value: `${scanned}`, inline: true },
          { name: 'Phishing Found', value: `${phishingFound}`, inline: true }
        )
        .setTimestamp();

      if (found.length > 0) {
        const list = found.slice(0, 5).map(f => `**${f.user}**: ${f.content}... [link](${f.url})`).join('\n');
        embed.addFields({ name: 'Phishing Messages', value: list.substring(0, 1024) });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'addpattern') {
      const pattern = isSlash ? interaction.options.getString('pattern') : args[0];
      if (!pattern) return interaction.reply({ content: 'Provide a regex pattern.', ephemeral: true });
      if (!config.phishingPatterns) config.phishingPatterns = [];
      try { new RegExp(pattern); } catch (e) { return interaction.reply({ content: 'Invalid regex pattern.', ephemeral: true }); }
      if (!config.phishingPatterns.includes(pattern)) config.phishingPatterns.push(pattern);
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Pattern \`${pattern}\` added to phishing detection.`)] });
    }

    if (subcommand === 'removepattern') {
      const pattern = isSlash ? interaction.options.getString('pattern') : args[0];
      if (!pattern) return interaction.reply({ content: 'Provide a pattern to remove.', ephemeral: true });
      config.phishingPatterns = (config.phishingPatterns || []).filter(p => p !== pattern);
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Pattern \`${pattern}\` removed.`)] });
    }

    if (subcommand === 'patterns') {
      const patterns = config.phishingPatterns || [];
      const defaultPatterns = ['discord.gg/nitro', 'free-nitro', 'claim-reward', 'verify-account', 'token-grab'];
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Phishing Patterns')
        .addFields(
          { name: `Custom Patterns (${patterns.length})`, value: patterns.length > 0 ? patterns.map(p => `\`${p}\``).join('\n') : 'None', inline: false },
          { name: `Built-in Patterns (${defaultPatterns.length})`, value: defaultPatterns.map(p => `\`${p}\``).join('\n'), inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'report') {
      const intel = await securityEngine.getLinkIntelligence(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setColor(0xff8800)
        .setTitle('Phishing Threat Report')
        .addFields(
          { name: 'Known Malicious', value: `${intel.knownMaliciousDomains?.length || 0}`, inline: true },
          { name: 'Phishing Campaigns', value: `${intel.phishingCampaigns?.length || 0}`, inline: true },
          { name: 'Blocked Domains', value: `${intel.blockedDomains?.length || 0}`, inline: true },
          { name: 'Threat Level', value: intel.threatLevel || 'low', inline: true },
          { name: 'Known Patterns', value: (intel.knownPatterns || []).join(', ') || 'None' }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
