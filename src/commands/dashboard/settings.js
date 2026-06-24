const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashsettings')
    .setDescription('Server settings dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ds'],
  prefix: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!guild) return;

    const guildConfig = await getGuild(guild.id);
    const tc = guildConfig.ticket_config || {};
    const prefix = guildConfig.prefix || '!';

    const mainEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${guild.name} - Settings`)
      .setDescription('Server configuration panel. Select a category to modify settings.')
      .addFields(
        { name: 'Prefix', value: `\`${prefix}\``, inline: true },
        { name: 'Tickets', value: `Enabled: \`${tc.enabled ? 'Yes' : 'No'}\``, inline: true },
        { name: 'Support Role', value: tc.support_role ? `<@&${tc.support_role}>` : '`Not set`', inline: true },
        { name: 'Log Channel', value: tc.log_channel ? `<#${tc.log_channel}>` : '`Not set`', inline: true },
        { name: 'Category', value: tc.category ? `<#${tc.category}>` : '`Not set`', inline: true },
        { name: 'Max Tickets', value: `\`${tc.max_tickets || 5}\``, inline: true }
      )
      .setTimestamp();

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_settings_select')
        .setPlaceholder('Select setting to modify...')
        .addOptions([
          { label: 'Prefix', description: `Current: ${prefix}`, value: 'prefix', emoji: '📝' },
          { label: 'Ticket Config', description: 'Configure ticket system', value: 'tickets', emoji: '🎫' },
          { label: 'Welcome', description: 'Welcome message settings', value: 'welcome', emoji: '👋' },
          { label: 'Logging', description: 'Log channel settings', value: 'logging', emoji: '📋' },
          { label: 'Moderation', description: 'Moderation settings', value: 'moderation', emoji: '⚔️' },
          { label: 'Anti-Raid', description: 'Anti-raid settings', value: 'antiraid', emoji: '🛡️' }
        ])
    );

    const response = await interaction.reply({ embeds: [mainEmbed], components: [selectRow], fetchReply: true });

    const filter = (i) => i.user.id === user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async (i) => {
      try {
        const setting = i.values[0];

        if (setting === 'prefix') {
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Prefix Settings')
            .setDescription(`Current prefix: \`${prefix}\`\n\nUse \`!setprefix <prefix>\` to change it.`)
            .setTimestamp();
          await i.update({ embeds: [embed], components: [selectRow] });
          return;
        }

        if (setting === 'tickets') {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('Ticket Configuration')
            .addFields(
              { name: 'Status', value: tc.enabled ? '`Enabled`' : '`Disabled`', inline: true },
              { name: 'Category', value: tc.category ? `<#${tc.category}>` : '`Not set`', inline: true },
              { name: 'Log Channel', value: tc.log_channel ? `<#${tc.log_channel}>` : '`Not set`', inline: true },
              { name: 'Support Role', value: tc.support_role ? `<@&${tc.support_role}>` : '`Not set`', inline: true },
              { name: 'Max Tickets', value: `\`${tc.max_tickets || 5}\``, inline: true },
              { name: 'Panel Message', value: (tc.ticket_message || 'Default').substring(0, 100), inline: false }
            )
            .setDescription('Use `!ticketconfig` to modify ticket settings.')
            .setTimestamp();
          await i.update({ embeds: [embed], components: [selectRow] });
          return;
        }

        if (setting === 'welcome') {
          const wc = guildConfig.welcome_config || {};
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('Welcome Settings')
            .addFields(
              { name: 'Channel', value: guildConfig.welcome_channel ? `<#${guildConfig.welcome_channel}>` : '`Not set`', inline: true },
              { name: 'Enabled', value: guildConfig.welcome_enabled ? '`Yes`' : '`No`', inline: true }
            )
            .setDescription('Use `!setwelcome` to configure welcome messages.')
            .setTimestamp();
          await i.update({ embeds: [embed], components: [selectRow] });
          return;
        }

        if (setting === 'logging') {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('Logging Settings')
            .addFields(
              { name: 'Log Channel', value: guildConfig.log_channel ? `<#${guildConfig.log_channel}>` : '`Not set`', inline: true },
              { name: 'Mod Log', value: guildConfig.mod_log_channel ? `<#${guildConfig.mod_log_channel}>` : '`Not set`', inline: true }
            )
            .setDescription('Use `!setlog` to set the log channel.')
            .setTimestamp();
          await i.update({ embeds: [embed], components: [selectRow] });
          return;
        }

        if (setting === 'moderation') {
          const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Moderation Settings')
            .addFields(
              { name: 'Mute Role', value: guildConfig.mute_role ? `<@&${guildConfig.mute_role}>` : '`Not set`', inline: true }
            )
            .setDescription('Use `!setmuterole` to set the mute role.')
            .setTimestamp();
          await i.update({ embeds: [embed], components: [selectRow] });
          return;
        }

        if (setting === 'antiraid') {
          const ar = guildConfig.antiraid_config || {};
          const embed = new EmbedBuilder()
            .setColor(0xff3300)
            .setTitle('Anti-Raid Settings')
            .addFields(
              { name: 'Enabled', value: guildConfig.antiraid_enabled ? '`Yes`' : '`No`', inline: true }
            )
            .setDescription('Use `!antiraid` to configure anti-raid protection.')
            .setTimestamp();
          await i.update({ embeds: [embed], components: [selectRow] });
          return;
        }
      } catch (err) {
        console.error('Settings dashboard error:', err);
      }
    });

    collector.on('end', () => {
      response.edit({ components: [] }).catch(() => {});
    });
  }
};
