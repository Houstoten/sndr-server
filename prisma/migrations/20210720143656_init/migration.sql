-- CreateTable
CREATE TABLE "filerequest" (
    "id" TEXT NOT NULL,
    "senderid" TEXT NOT NULL,
    "receiverid" TEXT NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,
    "accepted" BOOLEAN,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "filerequest" ADD FOREIGN KEY ("senderid") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filerequest" ADD FOREIGN KEY ("receiverid") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
