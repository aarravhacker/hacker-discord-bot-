const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List various things in the server')
    .addSubcommand(sub => sub.setName('admins').setDescription('List server admins'))
    .addSubcommand(sub => sub.setName('bans').setDescription('List banned members'))
    .addSubcommand(sub => sub.setName('boosters').setDescription('List server boosters'))
    .addSubcommand(sub => sub.setName('bots').setDescription('List all bots'))
    .addSubcommand(sub => sub.setName('emojis').setDescription('List all emojis'))
    .addSubcommand(sub => sub.setName('mods').setDescription('List server moderators'))
    .addSubcommand(sub => sub.setName('roles').setDescription('List all roles'))
    .addSubcommand(sub => sub.setName('invoices').setDescription('List voice channels'))
    .addSubcommand(sub => sub.setName('activeadmin').setDescription('List active admins'))
    .addSubcommand(sub => sub.setName('botemojis').setDescription('List bot-added emojis'))
    .addSubcommand(sub => sub.setName('createpos').setDescription('List members by join position'))
    .addSubcommand(sub => sub.setName('early').setDescription('List early supporters'))
    .addSubcommand(sub => sub.setName('invite').setDescription('List top inviters'))
    .addSubcommand(sub => sub.setName('joinpos').setDescription('Show your join position')),
  cooldown: 5,
  aliases: ['ls'],
  prefix: true,

  async execute(interaction, args) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    try {
      await guild.members.fetch();

      let embed;

      switch (sub) {
        case 'admins': {
          const admins = guild.members.cache.filter(m => m.permissions.has('Administrator'));
          const list = admins.map(m => m.user.tag).join('\n') || 'None';
          embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Server Admins')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'bans': {
          const bans = await guild.bans.fetch();
          const list = bans.map(b => `${b.user.tag} — ${b.reason || 'No reason'}`).join('\n') || 'No bans';
          embed = new EmbedBuilder()
            .setColor('#ff4444')
            .setTitle('Banned Members')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'boosters': {
          const boosters = guild.members.cache.filter(m => m.premiumSince);
          const list = boosters.map(m => `${m.user.tag} — since <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>`).join('\n') || 'No boosters';
          embed = new EmbedBuilder()
            .setColor('#ff73fa')
            .setTitle('Server Boosters')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'bots': {
          const bots = guild.members.cache.filter(m => m.user.bot);
          const list = bots.map(m => m.user.tag).join('\n') || 'No bots';
          embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('Bots')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'emojis': {
          const list = guild.emojis.cache.map(e => `${e} — \`${e.name}\``).join('\n') || 'No emojis';
          embed = new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('Server Emojis')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'mods': {
          const mods = guild.members.cache.filter(m =>
            m.permissions.has('ManageMessages') || m.permissions.has('ManageGuild')
          );
          const list = mods.map(m => m.user.tag).join('\n') || 'None';
          embed = new EmbedBuilder()
            .setColor('#00aaff')
            .setTitle('Server Moderators')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'roles': {
          const list = guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(r => `${r} — ${r.members.size} members`)
            .join('\n') || 'No roles';
          embed = new EmbedBuilder()
            .setColor('#57f287')
            .setTitle('Server Roles')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'invoices': {
          const channels = guild.channels.cache.filter(c => c.type === 2);
          const list = channels.map(c => `${c.name} — ${c.members.size} members`).join('\n') || 'No voice channels';
          embed = new EmbedBuilder()
            .setColor('#eb459e')
            .setTitle('Voice Channels')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'activeadmin': {
          const admins = guild.members.cache.filter(m => m.permissions.has('Administrator') && m.presence?.status !== 'offline');
          const list = admins.map(m => m.user.tag).join('\n') || 'No active admins';
          embed = new EmbedBuilder()
            .setColor('#00ff99')
            .setTitle('Active Admins')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'botemojis': {
          const botEmojis = guild.emojis.cache.filter(e => e.author?.bot);
          const list = botEmojis.map(e => `${e} — \`${e.name}\``).join('\n') || 'No bot-added emojis';
          embed = new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('Bot-Added Emojis')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'createpos': {
          const sorted = guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
          const list = sorted.map((m, i) => `${i + 1}. ${m.user.tag}`).join('\n') || 'No members';
          embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('Members by Join Order')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'early': {
          const sorted = guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
          const early = sorted.first(10);
          const list = early.map((m, i) => `${i + 1}. ${m.user.tag} — <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`).join('\n') || 'No members';
          embed = new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('Early Members')
            .setDescription(list.slice(0, 4000))
            .setTimestamp();
          break;
        }
        case 'invite': {
          const list = 'Invite tracking requires a database. Use an invite tracker plugin.';
          embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('Top Inviters')
            .setDescription(list)
            .setTimestamp();
          break;
        }
        case 'joinpos': {
          const sorted = guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
          const pos = sorted.map(m => m.id).indexOf(interaction.user.id) + 1;
          embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('Your Join Position')
            .setDescription(`You are member **#${pos}** to join this server.`)
            .setTimestamp();
          break;
        }
        default:
          return interaction.reply({
            embeds: [errorEmbed('Unknown subcommand.')],
            ephemeral: true,
          });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        embeds: [errorEmbed('Failed to list data.')],
        ephemeral: true,
      });
    }
  },
};
