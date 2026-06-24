const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const SLASH_LIST = [
  'help', 'ping', 'stats', 'botinfo', 'serverinfo', 'userinfo',
  'translate', 'weather',
  'play', 'stop', 'skip', 'queue', 'pause', 'resume', 'volume',
  'ban', 'kick', 'mute', 'warn', 'purge',
  'antinuke', 'antiraid', 'lockdown',
  'automod',
  'giveaway', 'gstart',
  'balance', 'daily', 'work',
  'rank', 'level',
  'ticket', 'open'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkcmds')
    .setDescription('Deep check all commands for errors (owner only)'),
  cooldown: 10,
  aliases: ['checkcommands', 'checkcmd'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    if (user.id !== process.env.OWNER_ID) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setDescription('❌ Owner only command.').setColor(0xff0000)
      ] });
    }

    let checking;
    if (isSlash) {
      checking = await interaction.reply({ embeds: [
        new EmbedBuilder().setDescription('🔄 Deep checking all commands...').setColor(0xffaa00)
      ], fetchReply: true });
    } else {
      checking = await interaction.channel.send({ embeds: [
        new EmbedBuilder().setDescription('🔄 Deep checking all commands...').setColor(0xffaa00)
      ] });
    }

    const commandsPath = path.join(__dirname, '..', '..', 'commands');
    const categories = fs.readdirSync(commandsPath);
    const results = { ok: [], broken: [], warnings: [] };

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      if (!fs.statSync(categoryPath).isDirectory()) continue;

      const entries = fs.readdirSync(categoryPath);
      for (const entry of entries) {
        const entryPath = path.join(categoryPath, entry);

        if (fs.statSync(entryPath).isDirectory()) {
          const files = fs.readdirSync(entryPath).filter(f => f.endsWith('.js'));
          for (const file of files) {
            deepCheck(path.join(entryPath, file), category, results);
          }
        } else if (entry.endsWith('.js')) {
          deepCheck(entryPath, category, results);
        }
      }
    }

    const total = results.ok.length + results.broken.length + results.warnings.length;
    let desc = `**Checked:** ${total} files\n`;
    desc += `**✅ OK:** ${results.ok.length}\n`;
    desc += `**❌ Broken:** ${results.broken.length}\n`;
    desc += `**⚠️ Warnings:** ${results.warnings.length}\n\n`;

    if (results.broken.length > 0) {
      desc += '**❌ BROKEN (will crash at runtime):**\n';
      for (const b of results.broken) {
        desc += `\`${b.name}\` (${b.cat}) \n  → ${b.error}\n`;
      }
      desc += '\n';
    }

    if (results.warnings.length > 0) {
      desc += '**⚠️ WARNINGS (may break with prefix):**\n';
      for (const w of results.warnings) {
        desc += `\`${w.name}\` (${w.cat}) \n  → ${w.error}\n`;
      }
      desc += '\n';
    }

    if (results.ok.length > 0) {
      desc += `**✅ OK (${results.ok.length}):**\n`;
      desc += results.ok.map(c => `\`${c}\``).join(', ');
    }

    if (desc.length > 4000) desc = desc.substring(0, 3990) + '...';

    await checking.edit({ embeds: [
      new EmbedBuilder()
        .setTitle('Deep Command Health Check')
        .setDescription(desc)
        .setColor(results.broken.length > 0 ? 0xff0000 : 0x00ff00)
        .setTimestamp()
    ] });
  }
};

function deepCheck(filePath, category, results) {
  const fileName = path.basename(filePath, '.js');

  try {
    let code;
    try { code = fs.readFileSync(filePath, 'utf8'); } catch { return; }

    const cmd = require(filePath);

    if (!cmd || typeof cmd !== 'object') {
      return results.broken.push({ name: fileName, cat: category, error: 'Module is not an object' });
    }
    if (!cmd.data?.name) {
      return results.broken.push({ name: fileName, cat: category, error: 'Missing data.name' });
    }
    if (typeof cmd.execute !== 'function') {
      return results.broken.push({ name: cmd.data.name, cat: category, error: 'Missing execute function' });
    }

    const name = cmd.data.name;
    const issues = [];

    if (code.includes('.getSubcommand()') && !code.includes('isSlash')) {
      issues.push('Uses .getSubcommand() without isSlash check — will crash on prefix');
    }

    if (code.includes('.getString(') && !code.includes('isSlash') && !code.includes('args')) {
      issues.push('Uses .getString() without isSlash check — will crash on prefix');
    }

    if (code.includes('.getInteger(') && !code.includes('isSlash') && !code.includes('args')) {
      issues.push('Uses .getInteger() without isSlash check — will crash on prefix');
    }

    if (code.includes('.getMember(') && !code.includes('isSlash') && !code.includes('args')) {
      issues.push('Uses .getMember() without isSlash check — will crash on prefix');
    }

    if (code.includes('.getUser(') && !code.includes('isSlash') && !code.includes('args') && !code.includes('mentions')) {
      issues.push('Uses .getUser() without isSlash check — will crash on prefix');
    }

    if (code.includes('.getBoolean(') && !code.includes('isSlash')) {
      issues.push('Uses .getBoolean() without isSlash check — will crash on prefix');
    }

    if (code.includes('.getChannel(') && !code.includes('isSlash') && !code.includes('args')) {
      issues.push('Uses .getChannel() without isSlash check — will crash on prefix');
    }

    if (code.includes('ephemeral: true') && !code.includes('isSlash')) {
      issues.push('Uses ephemeral: true — will fail on prefix (Message has no ephemeral)');
    }

    if (code.includes('.deferReply(') && !code.includes('isSlash')) {
      issues.push('Uses .deferReply() — will crash on prefix (Message has no deferReply)');
    }

    if (code.includes('.editReply(') && !code.includes('isSlash') && !code.includes('sent.edit')) {
      issues.push('Uses .editReply() — will crash on prefix (Message has no editReply)');
    }

    if (code.includes('.followUp(') && !code.includes('isSlash')) {
      issues.push('Uses .followUp() — will crash on prefix (Message has no followUp)');
    }

    if (SLASH_LIST.includes(name) && !code.includes('isSlash') && !code.includes('args')) {
      issues.push('Is a slash command but has no isSlash detection — prefix won\'t work');
    }

    if (code.includes('interaction.options?.getSubcommand()') && code.includes("args?.[0]") === false) {
      if (!code.includes('isSlash')) {
        issues.push('Has subcommands but no prefix fallback for subcommand');
      }
    }

    if (issues.length > 0) {
      for (const issue of issues) {
        results.warnings.push({ name, cat: category, error: issue });
      }
    } else {
      results.ok.push(name);
    }

  } catch (err) {
    results.broken.push({ name: fileName, cat: category, error: `Load error: ${err.message}` });
  }
}
