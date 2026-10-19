FROM node:20-alpine AS base
# ติดตั้ง dependencies สำหรับ Canvas และฟอนต์ไทย
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    fontconfig \
    ttf-freefont

WORKDIR /app

# คัดลอกและติดตั้ง Dependencies
COPY package*.json ./
COPY prisma ./prisma/
# ใช้ PostgreSQL schema สำหรับ Docker Container ตาม blueprint
RUN cp prisma/schema.postgresql.prisma prisma/schema.prisma
RUN npm install

# คัดลอกซอร์สโค้ดและสร้างโปรเจกต์
COPY . .
RUN cp prisma/schema.postgresql.prisma prisma/schema.prisma
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
