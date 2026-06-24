const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memberinfo')
    .setDescription('Shows detailed member information')
    .addUserOption(opt => opt.setName('user').setDescription('Member to get info about').setRequired(false)),
  cooldown: 5,
  aliases: ['mi'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();

            if (!interaction.guild) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('This command can only be used in a server.').setColor(config.embedColors.error)] });

            let target;
            if (isSlash) {
              target = interaction.options?.getUser('user') || interaction.user;
            } else {
              const userId = args?.[0]?.replace(/[<>@!]/g, '') || interaction.author?.id;
              target = await interaction.client.users.fetch(userId).catch(() => interaction.author);
            }

            const member = await interaction.guild.members.fetch(target.id).catch(() => null);
            if (!member) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Member not found.').setColor(config.embedColors.error)] });

            const roles = member.roles.cache
              .filter(r => r.id !== interaction.guild.id)
              .sort((a, b) => b.position - a.position)
              .map(r => `<@&${r.id}>`)
              .join(', ') || 'None';

            const embed = new EmbedBuilder()
              .setTitle(`${target.tag}`)
              .setThumbnail(target.displayAvatarURL({ dynamic: true }))
              .setColor(member.displayHexColor || config.embedColors.info)
              .addFields(
                { name: 'ID', value: target.id, inline: true },
                { name: 'Nickname', value: member.nickname || 'None', inline: true },
                { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Hoist Role', value: member.roles.hoist ? `<@&${member.roles.hoist.id}>` : 'None', inline: true },
                { name: `Roles [${member.roles.cache.size - 1}]`, value: roles.substring(0, 1024) }
              )
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
