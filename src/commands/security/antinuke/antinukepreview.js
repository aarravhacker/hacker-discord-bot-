const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukepreview')
    .setDescription('Preview what antinuke would do in a threat scenario')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('scenario')
        .setDescription('Scenario to preview')
        .setRequired(true)
        .addChoices(
          { name: 'Mass Channel Delete', value: 'channel_delete' },
          { name: 'Mass Role Delete', value: 'role_delete' },
          { name: 'Mass Role Create', value: 'role_create' },
          { name: 'Permission Changes', value: 'permission_change' },
          { name: 'Bot Abuse', value: 'bot_abuse' },
          { name: 'Webhook Spam', value: 'webhook_spam' }
        )
    ),

  cooldown: 10,
  aliases: ['anpreview', 'apreview'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const scenario = isSlash ? interaction.options.getString('scenario') : args[0];
    if (!scenario) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Missing Scenario')
        .setDescription('Please provide a scenario to preview.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      await interaction.deferReply();
      const preview = await securityEngine.previewResponse(interaction.guild.id, scenario);

      const scenarioNames = {
        channel_delete: 'Mass Channel Delete',
        role_delete: 'Mass Role Delete',
        role_create: 'Mass Role Create',
        permission_change: 'Permission Changes',
        bot_abuse: 'Bot Abuse',
        webhook_spam: 'Webhook Spam'
      };

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`👁️ Antinuke Preview - ${scenarioNames[scenario] || scenario}`)
        .setDescription('Here\'s what antinuke would do if this threat was detected:')
        .addFields(
          { name: 'Scenario', value: scenarioNames[scenario] || scenario, inline: true },
          { name: 'Detection Method', value: preview?.detection || 'Event monitoring', inline: true },
          { name: 'Response Time', value: preview?.responseTime || 'Instant', inline: true }
        )
        .setTimestamp();

      if (preview?.actions?.length) {
        const actionsList = preview.actions.map((a, i) => `\`${i + 1}.\` ${a}`).join('\n');
        embed.addFields({ name: 'Actions That Would Be Taken', value: actionsList });
      } else {
        embed.addFields({ name: 'Actions', value: 'No automatic actions configured for this scenario.' });
      }

      if (preview?.notifications?.length) {
        const notifList = preview.notifications.join('\n');
        embed.addFields({ name: 'Notifications', value: notifList });
      }

      if (preview?.rollback) {
        embed.addFields({ name: 'Rollback', value: 'Automatic rollback would be attempted.' });
      }

      embed.addFields({ name: '⚠️ Note', value: 'This is a preview only. No actions have been taken.' });
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Preview Error')
        .setDescription(`Failed to generate preview: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
