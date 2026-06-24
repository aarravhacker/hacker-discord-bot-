const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linkwhitelist')
    .setDescription('Manage link whitelist')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action').setDescription('Add, remove, or list').setRequired(true)
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' })
    )
    .addStringOption(opt =>
      opt.setName('domain').setDescription('Domain to whitelist')
    ),
  cooldown: 5,
  aliases: ['lwl'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antilinkConfig = JSON.parse(guildData.antilink_config || '{}');
      let whitelist = antilinkConfig.linkWhitelist || [];

      if (isSlash) {
        const action = interaction.options?.getString('action');
        const domain = interaction.options?.getString('domain');

        if (action === 'list') {
          if (whitelist.length === 0) {
            return interaction.reply({ embeds: [infoEmbed('Link Whitelist', 'The whitelist is empty.')] });
          }
          const list = whitelist.map(d => `\`${d}\``).join(', ');
          return interaction.reply({ embeds: [successEmbed('Link Whitelist', list)] });
        }

        if (!domain) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please specify a domain.')] });
        }

        if (action === 'add') {
          if (whitelist.includes(domain)) {
            return interaction.reply({ embeds: [warningEmbed('Warning', 'Domain is already whitelisted.')] });
          }
          whitelist.push(domain);
        } else {
          whitelist = whitelist.filter(d => d !== domain);
        }

        antilinkConfig.linkWhitelist = whitelist;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(antilinkConfig) });

        await interaction.reply({
          embeds: [successEmbed('Link Whitelist', `${action === 'add' ? '✅ Added' : '❌ Removed'} \`${domain}\` ${action === 'add' ? 'to' : 'from'} the whitelist.`)]
        });
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length === 0 || args[0] === 'list') {
          if (whitelist.length === 0) {
            return interaction.reply({ embeds: [infoEmbed('Link Whitelist', 'The whitelist is empty.')] });
          }
          const list = whitelist.map(d => `\`${d}\``).join(', ');
          return interaction.reply({ embeds: [successEmbed('Link Whitelist', list)] });
        }

        if (args.length < 3) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: linkwhitelist <add|remove|list> <domain>')] });
        }

        const action = args[0].toLowerCase();
        const domain = args[2];

        if (action === 'add') {
          if (whitelist.includes(domain)) {
            return interaction.reply({ embeds: [warningEmbed('Warning', 'Domain is already whitelisted.')] });
          }
          whitelist.push(domain);
        } else if (action === 'remove') {
          whitelist = whitelist.filter(d => d !== domain);
        }

        antilinkConfig.linkWhitelist = whitelist;
        await updateGuild(guild.id, { antilink_config: JSON.stringify(antilinkConfig) });

        await interaction.reply({
          embeds: [successEmbed('Link Whitelist', `${action === 'add' ? '✅ Added' : '❌ Removed'} \`${domain}\` ${action === 'add' ? 'to' : 'from'} the whitelist.`)]
        });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to manage link whitelist.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
