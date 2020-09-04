const { MessageEmbed } = require("discord.js");
const { stripIndents } = require('common-tags');
const { Utils } = require('erela.js');
const discord = require('discord.js')

module.exports = {
    name: 'play',
    description: 'Plays a song or playlist on the bot!',
    args: true,
    usage: '[song search/song or playlist link]',
    guildOnly: true,
    cooldown: 0,
    aliases: ['p'],
    accessibleBy: 'Everyone',
    category: 'Music',
    run: async(client, message, args, PREFIX) => {
        if(!message.author.bot) {
            let args = message.content.substring(PREFIX.length).split(new RegExp(/\s+/));
            const { channel } = message.member.voice;
            if (!channel) return message.channel.send({
                embed: new discord.MessageEmbed()
                .setColor("RANDOM")
                .setDescription("You need to be in a voice channel to play music.")
            });

            if (!args[0]) return message.channel.send({
                embed: new discord.MessageEmbed()
                .setColor("RANDOM")
                .setDescription("Please provide a song name or link to search.")
            });

            const player = client.music.players.spawn({
                guild: message.guild,
                textChannel: message.channel,
                voiceChannel: channel
            });

            client.music.search(args.join(" "), message.author).then(async res => {
                switch (res.loadType) {
                    case "TRACK_LOADED":
                        player.queue.add(res.tracks[0]);
                        message.channel.send({
                            embed: new discord.MessageEmbed()
                            .setColor("RANDOM")
                            .setDescription(`Enqueuing ${res.tracks[0].title} \`${Utils.formatTime(res.tracks[0].duration, true)}\``)
                        });
                        if (!player.playing) player.play()
                        break;
                    
                    case "SEARCH_RESULT":
                        let index = 1;
                        const tracks = res.tracks.slice(0, 5);
                        const embed = new MessageEmbed()
                            .setAuthor("Song Selection.", message.author.displayAvatarURL)
                            .setDescription(tracks.map(video => `**${index++} -** ${video.title}`))
                            .setFooter("Your response time closes within the next 30 seconds. Type 'cancel' to cancel the selection");

                        await message.channel.send(embed);

                        const collector = message.channel.createMessageCollector(m => {
                            return m.author.id === message.author.id && new RegExp(`^([1-5]|cancel)$`, "i").test(m.content)
                        }, { time: 30000, max: 1});

                        collector.on("collect", m => {
                            if (/cancel/i.test(m.content)) return collector.stop("cancelled")

                            const track = tracks[Number(m.content) - 1];
                            player.queue.add(track)
                            message.channel.send({
                                embed: new discord.MessageEmbed()
                                .setColor("RANDOM")
                                .setDescription(`Enqueuing ${track.title} \`${Utils.formatTime(track.duration, true)}\``)
                            });
                            if(!player.playing) player.play();
                        });

                        collector.on("end", (_, reason) => {
                            if(["time", "cancelled"].includes(reason)) return message.channel.send("Cancelled selection.")
                        });
                        break;

                    case "PLAYLIST_LOADED":
                        res.playlist.tracks.forEach(track => player.queue.add(track));
                        const duration = Utils.formatTime(res.playlist.tracks.reduce((acc, cur) => ({duration: acc.duration + cur.duration})).duration, true);
                        message.channel.send({
                            embed: new discord.MessageEmbed()
                            .setColor("RANDOM")
                            .setDescription(`Enqueuing \`${res.playlist.tracks.length}\` \`${duration}\` tracks in playlist ${res.playlist.info.name}`)
                        });
                        if(!player.playing) player.play()
                        break;
                }
            }).catch(err => message.channel.send({
                embed: new discord.MessageEmbed()
                .setColor("RANDOM")
                .setDescription(err.message)
            }))
        } else {
            return;
        }
    }
}

