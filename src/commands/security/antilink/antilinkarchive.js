const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilinkarchive')
    .setDescription('Link history archive - track all links posted in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable link archiving'))
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable link archiving'))
    .addSubcommand(sub =>
      sub.setName('search')
        .setDescription('Search archived links')
        .addStringOption(opt => opt.setName('query').setDescription('Search term (domain, user, keyword)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('View links posted by a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('top').setDescription('View most common domains posted'))
    .addSubcommand(sub =>
      sub.setName('export').setDescription('Export link archive'))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View link archive status')),

  cooldown: 5,
  aliases: ['alarchive', 'linkhistory'],
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
      config.linkArchive = true;
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription('Link archiving enabled. All links posted will be tracked.')] });
    }

    if (subcommand === 'disable') {
      config.linkArchive = false;
      await updateGuild(interaction.guild.id, { antilink_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Link archiving disabled.')] });
    }

    if (subcommand === 'search') {
      await interaction.deferReply();
      const query = isSlash ? interaction.options.getString('query') : args[0];
      if (!query) return interaction.editReply({ content: 'Provide a search query.' });

      const db = require('../../../db/connection').getDB();
      const results = await db('security_actions')
        .where({ guild_id: interaction.guild.id })
        .whereRaw("details LIKE ?", [`%${query}%`])
        .orderBy('created_at', 'desc')
        .limit(25);

      const embed = new EmbedBuilder()
        .setColor(results.length > 0 ? 0x0099ff : 0x00ff00)
        .setTitle('Link Search Results')
        .setDescription(`Found **${results.length}** matches for \`${query}\``)
        .setTimestamp();

      if (results.length > 0) {
        const list = results.slice(0, 10).map(r => {
          const d = JSON.parse(r.details || '{}');
          return `\`${new Date(r.created_at).toLocaleString()}\` <@${r.user_id}>: ${d.content?.substring(0, 80) || 'N/A'}`;
        }).join('\n');
        embed.addFields({ name: 'Results', value: list.substring(0, 1024) });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'user') {
      await interaction.deferReply();
      const target = isSlash ? interaction.options.getUser('user') : null;
      if (!target) return interaction.editReply({ content: 'Provide a user to check.' });

      const db = require('../../../db/connection').getDB();
      const results = await db('security_actions')
        .where({ guild_id: interaction.guild.id, user_id: target.id })
        .orderBy('created_at', 'desc')
        .limit(25);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`Link History: ${target.tag}`)
        .setDescription(`**${results.length}** actions recorded`)
        .setTimestamp();

      if (results.length > 0) {
        const list = results.slice(0, 10).map(r => `\`${new Date(r.created_at).toLocaleString()}\` ${r.action}`).join('\n');
        embed.addFields({ name: 'Actions', value: list.substring(0, 1024) });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'top') {
      await interaction.deferReply();
      const db = require('../../../db/connection').getDB();
      const results = await db('security_actions')
        .where({ guild_id: interaction.guild.id })
        .select('action')
        .count('* as count')
        .groupBy('action')
        .orderBy('count', 'desc')
        .limit(10);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Top Actions')
        .setTimestamp();

      if (results.length > 0) {
        const list = results.map(r => `**${r.action}**: ${r.count}`).join('\n');
        embed.addFields({ name: 'Actions', value: list });
      } else {
        embed.setDescription('No actions recorded yet.');
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'export') {
      await interaction.deferReply();
      const db = require('../../../db/connection').getDB();
      const results = await db('security_actions')
        .where({ guild_id: interaction.guild.id })
        .orderBy('created_at', 'desc')
        .limit(100);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Link Archive Export')
        .setDescription(`**${results.length}** records exported`)
        .setTimestamp();

      if (results.length > 0) {
        const csv = results.map(r => `${new Date(r.created_at).toISOString()},${r.user_id},${r.action},${JSON.parse(r.details || '{}').content || ''}`).join('\n');
        const buffer = Buffer.from(csv, 'utf-8');
        const attachment = { attachment: buffer, name: `link-archive-${interaction.guild.id}.csv` };
        return interaction.editReply({ embeds: [embed], files: [attachment] });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'status') {
      const enabled = config.linkArchive || false;
      const db = require('../../../db/connection').getDB();
      const count = await db('security_actions').where({ guild_id: interaction.guild.id }).count('id as c').first();
      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(enabled ? 0x00ff00 : 0xff0000)
        .setTitle('Link Archive Status')
        .addFields(
          { name: 'Archiving', value: enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Total Records', value: `${count?.c || 0}`, inline: true }
        )
        .setTimestamp()
      ] });
    }
  }
};
