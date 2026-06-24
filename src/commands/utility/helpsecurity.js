const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, createEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('helpsecurity')
    .setDescription('Shows all security commands')
    .addStringOption(opt =>
      opt.setName('category').setDescription('Category to view')
        .addChoices(
          { name: 'all', value: 'all' },
          { name: 'antinuke', value: 'antinuke' },
          { name: 'antispam', value: 'antispam' },
          { name: 'antilink', value: 'antilink' },
          { name: 'antiraid', value: 'antiraid' },
          { name: 'lockdown', value: 'lockdown' }
        )
    ),
  cooldown: 5,
  aliases: ['hs'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const category = isSlash ? (interaction.options.getString('category') || 'all') : (args?.[0] || 'all');

    try {
      const guildData = await getGuild(interaction.guild.id);
      const categories = {
        antinuke: {
          name: '🛡️ Anti-Nuke',
          color: config.embedColors.antinuke,
          commands: [
            { name: '/antinuke enable', desc: 'Enable antinuke protection' },
            { name: '/antinuke disable', desc: 'Disable antinuke protection' },
            { name: '/antinuke status', desc: 'View antinuke status' },
            { name: '/antinuke setup', desc: 'Quick setup with defaults' },
            { name: '/antinuke punishment', desc: 'Set punishment type' },
            { name: '/antinuke owner add', desc: 'Add an owner' },
            { name: '/antinuke owner remove', desc: 'Remove an owner' },
            { name: '/antinuke whitelist add', desc: 'Add user to whitelist' },
            { name: '/antinuke threshold channel', desc: 'Set channel delete threshold' },
            { name: '/antinuke threshold role', desc: 'Set role modify threshold' },
            { name: '/antinuke threshold member', desc: 'Set member action threshold' },
            { name: '/antinuke timeout duration', desc: 'Set default timeout duration' },
            { name: '/antinukeconfig', desc: 'Configure detailed antinuke settings' },
            { name: '/antinukethreshold', desc: 'Set action thresholds' },
            { name: '/antinuketimeout', desc: 'Timeout a detected user' },
            { name: '/antinukebackup', desc: 'Create/restore backup' },
            { name: '/antinukescan', desc: 'Scan for threats' },
            { name: '/antinukelog', desc: 'View antinuke logs' }
          ]
        },
        antispam: {
          name: '💬 Anti-Spam',
          color: 0xffaa00,
          commands: [
            { name: '/antispam enable', desc: 'Enable antispam protection' },
            { name: '/antispam disable', desc: 'Disable antispam protection' },
            { name: '/antispam status', desc: 'View antispam status' },
            { name: '/antispam setup', desc: 'Quick setup with defaults' },
            { name: '/antispam action', desc: 'Set punishment action' },
            { name: '/antispam limit', desc: 'Set message limit' },
            { name: '/antispam duration', desc: 'Set mute/timeout duration' },
            { name: '/antispam punishlevel', desc: 'Set escalation mode' },
            { name: '/antispam ignore user', desc: 'Add/remove user from ignore' },
            { name: '/antispam ignore channel', desc: 'Add/remove channel from ignore' },
            { name: '/antispam ignore role', desc: 'Add/remove role from ignore' },
            { name: '/antispam bypass add', desc: 'Add bypass role' },
            { name: '/antispamconfig', desc: 'Configure antispam settings' },
            { name: '/antispamlimit', desc: 'Set message limit' },
            { name: '/antispamaction', desc: 'Set action type' }
          ]
        },
        antilink: {
          name: '🔗 Anti-Link',
          color: 0x00ff00,
          commands: [
            { name: '/antilink enable', desc: 'Enable antilink protection' },
            { name: '/antilink disable', desc: 'Disable antilink protection' },
            { name: '/antilink status', desc: 'View antilink status' },
            { name: '/antilink setup', desc: 'Quick setup with defaults' },
            { name: '/antilink action', desc: 'Set punishment action' },
            { name: '/antilink mode', desc: 'Set blocking mode' },
            { name: '/antilink duration', desc: 'Set mute duration' },
            { name: '/antilink whitelistdomain', desc: 'Add/remove whitelisted domain' },
            { name: '/antilink ignore user', desc: 'Add/remove user from ignore' },
            { name: '/antilink ignore channel', desc: 'Add/remove channel from ignore' },
            { name: '/antilink ignore role', desc: 'Add/remove role from ignore' },
            { name: '/antilinkconfig', desc: 'Configure antilink settings' }
          ]
        },
        antiraid: {
          name: '🚨 Anti-Raid',
          color: config.embedColors.antiraid,
          commands: [
            { name: '/antiraid', desc: 'Toggle antiraid protection' },
            { name: '/antiraidconfig', desc: 'Configure antiraid settings' },
            { name: '/raid test', desc: 'Test raid detection' },
            { name: '/raid status', desc: 'View raid status' }
          ]
        },
        lockdown: {
          name: '🔒 Lockdown',
          color: 0x9933ff,
          commands: [
            { name: '/lockdown', desc: 'Toggle lockdown' },
            { name: '/lockdownemergency', desc: 'Emergency lockdown' },
            { name: '/lockdownconfig', desc: 'Configure lockdown settings' }
          ]
        }
      };

      const embed = new EmbedBuilder()
        .setTitle('🛡️ Security Commands')
        .setColor(config.embedColors.security)
        .setDescription('Complete security command reference for your server.');

      const statusFields = [
        { name: 'Anti-Nuke', value: guildData.antinuke_enabled ? '🟢 ON' : '🔴 OFF', inline: true },
        { name: 'Anti-Spam', value: guildData.antispam_enabled ? '🟢 ON' : '🔴 OFF', inline: true },
        { name: 'Anti-Link', value: guildData.antilink_enabled ? '🟢 ON' : '🔴 OFF', inline: true },
        { name: 'Anti-Raid', value: guildData.antiraid_enabled ? '🟢 ON' : '🔴 OFF', inline: true }
      ];
      embed.addFields({ name: '━━━ Protection Status ━━━', value: '\u200B' });
      embed.addFields(...statusFields);

      if (category === 'all') {
        for (const [key, cat] of Object.entries(categories)) {
          const cmdList = cat.commands.map(c => `\`${c.name}\` - ${c.desc}`).join('\n');
          embed.addFields({ name: cat.name, value: cmdList || 'No commands available.' });
        }
      } else if (categories[category]) {
        const cat = categories[category];
        const cmdList = cat.commands.map(c => `\`${c.name}\` - ${c.desc}`).join('\n');
        embed.addFields({ name: cat.name, value: cmdList || 'No commands available.' });
      }

      embed.setFooter({ text: 'Use /helpsecurity <category> to filter by category.' });
      interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ embeds: [errorEmbed('Error', 'An error occurred while executing this command.')] });
    }
  }
};
