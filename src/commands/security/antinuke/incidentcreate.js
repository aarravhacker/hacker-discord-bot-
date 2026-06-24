const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('incidentcreate')
    .setDescription('Create a manual incident report')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('type').setDescription('Incident type').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('Incident description').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('severity').setDescription('Severity level')
        .addChoices(
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
          { name: 'High', value: 'high' },
          { name: 'Critical', value: 'critical' }
        )
    )
    .addUserOption(opt =>
      opt.setName('actor').setDescription('User involved')
    ),
  cooldown: 5,
  aliases: ['icreate', 'ireport'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const type = isSlash ? interaction.options.getString('type') : (args[0] || '');
      const description = isSlash ? interaction.options.getString('description') : args.slice(1).join(' ');
      const severity = isSlash ? interaction.options.getString('severity') : 'medium';
      const actor = isSlash ? interaction.options.getUser('actor') : null;

      if (!type) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide an incident type.');
        return interaction.reply({ embeds: [embed] });
      }

      if (!description) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide a description for the incident.');
        return interaction.reply({ embeds: [embed] });
      }

      const incident = securityEngine.logIncident(
        guild.id,
        actor ? actor.id : user.id,
        `manual_${type.toLowerCase().replace(/\s+/g, '_')}`,
        {
          description,
          severity: severity || 'medium',
          reportedBy: user.tag,
          reportedById: user.id,
          actorTag: actor ? actor.tag : null,
          isManual: true
        }
      );

      const severityColors = {
        low: 0x57f287,
        medium: 0xfee75c,
        high: 0xffa500,
        critical: 0xff0000
      };

      const embed = new EmbedBuilder()
        .setTitle('✅ Incident Created')
        .setDescription(`Manual incident report **#${incident.id}** has been filed.`)
        .setColor(severityColors[severity] || 0xfee75c)
        .addFields(
          { name: 'Incident ID', value: `\`${incident.id}\``, inline: true },
          { name: 'Type', value: `**${type}**`, inline: true },
          { name: 'Severity', value: `**${(severity || 'medium').toUpperCase()}**`, inline: true },
          { name: 'Description', value: description.substring(0, 1024), inline: false },
          { name: 'Reported By', value: `${user.tag}`, inline: true },
          { name: 'Actor', value: actor ? `${actor.tag}` : 'N/A', inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while creating the incident report.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
