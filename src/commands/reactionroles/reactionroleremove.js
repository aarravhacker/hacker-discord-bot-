const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroleremove')
    .setDescription('Remove an emoji-role pair from a reaction role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('id').setDescription('Reaction role ID').setRequired(true))
    .addStringOption(opt => opt.setName('emoji').setDescription('The emoji to remove').setRequired(true)),
  cooldown: 5,
  aliases: ['rrremove'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const db = getDB();
    const id = isSlash ? interaction.options?.getInteger('id') : (args?.[0] ? parseInt(args[0]) : null);
    const emoji = isSlash ? interaction.options?.getString('emoji') : args?.[1];

    const rr = await db('reaction_roles').where({ id, guild_id: interaction.guild.id }).first();
    if (!rr) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Reaction role not found.')] });

    const roles = Array.isArray(rr.roles) ? [...rr.roles] : [];
    const idx = roles.findIndex(r => r.emoji === emoji);
    if (idx === -1) return interaction.reply({ embeds: [errorEmbed('Not Found', `No role found for emoji ${emoji}.`)] });

    roles.splice(idx, 1);
    await db('reaction_roles').where({ id }).update({ roles: JSON.stringify(roles) });

    try {
      const channel = await interaction.guild.channels.fetch(rr.channel_id);
      const message = await channel.messages.fetch(rr.message_id);
      const reaction = message.reactions.cache.find(r => r.emoji.toString() === emoji || r.emoji.name === emoji);
      if (reaction) await reaction.remove();
    } catch (e) {}

    return interaction.reply({ embeds: [successEmbed('Removed', `Removed ${emoji} from reaction role #${id}.`)] });
  }
};
