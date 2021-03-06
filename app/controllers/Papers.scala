package controllers

import play.api.mvc._
import services.{UsernameAuth, PaperDAO}
import models.{Paper, JsonResult}
import play.api.libs.concurrent.Execution.Implicits._
import play.api.libs.json.{JsObject, Json}
import util.{T8Logger, Aggregation, Generator}
import scala.concurrent.Future
import play.api.Logger
import util.Implicits._
import scala.collection.mutable
import common.Common._
import clientmodels.ClientSession
import scala.concurrent.duration._

object Papers extends Controller {

  def index = Action {
    implicit req =>
      Ok(views.html.index())
  }

  /**
   * Load a saved paper
   * @param id
   * @return
   */
  def paperView(id: String) = Action.async {
    implicit req =>
      for {
        p <- PaperDAO.findByIdModel(id)
      } yield {
        p match {
          case Some(p) =>
            tryOrError {
              if (UsernameAuth.isOwner(p.username, ClientSession.fromReq.map(_.username))) {
                val paperJson = Paper.model2json(p)
                Ok(views.html.paper(JsonResult.jsonSuccess(paperJson)))
              } else {
                JsonResult.noPermission
              }
            }
          case None =>
            JsonResult.error("Paper not found")
        }
      }
  }

  // For debug purposes
  def paperInfo(id: String) = Action.async {
    implicit req =>
      for {
        p <- PaperDAO.findByIdModel(id)
      } yield {
        p match {
          case Some(p) =>
            tryOrError {
              if (UsernameAuth.isOwner(p.username, ClientSession.fromReq.map(_.username))) {
                val sb = mutable.StringBuilder.newBuilder

                var data = mutable.HashMap[String, String]()
                data += "id" -> p._id
                data += "title" -> p.title
                data += "username" -> p.username.toString
                data += "number of elements" -> p.elements.size.toString
                data += "number of groups" -> p.groups.size.toString
                data += "number of tags" -> p.tags.size.toString
                data += "permissions" -> p.permissions.toString
                data = data.map(t => t._1.capitalize -> t._2)
                sb.append(data.toList.sortBy(_._1).map(t => s"${t._1} -> ${t._2}").mkString("\n"))
                sb.append("\n\n")

                sb.append(Json.prettyPrint(PaperDAO.jsonable.model2json(p)))
                Ok(sb.toString)
              } else {
                JsonResult.noPermission
              }
            }
          case None =>
            JsonResult.error("Paper not found")
        }
      }
  }

  /**
   * Save paper
   * @param id
   * @return
   */
  def paperSubmit(id: String) = Action.async {
    implicit req =>
      def readPaper(p: Option[Paper]): Future[SimpleResult] = {
        p match {
          case None =>
            Future.successful(
              JsonResult.error("Old paper not found"))
          case Some(oldpaper) =>
            req.body.asJson match {
              case None =>
                Future.successful(
                  JsonResult.error("Input is not a valid json"))
              case Some(json) =>
                if (UsernameAuth.isOwner(json getAsString Paper.username, ClientSession.fromReq.map(_.username))) {
                  val newPaper = Paper.json2model(json)
                  if (oldpaper._id != newPaper._id) {

                    Future.successful(
                      JsonResult.error("Oldpaper and newpaper ids are not equal"))
                  } else if (oldpaper == newPaper) {

                    Future.successful(
                      JsonResult.error("Paper not changed"))
                  } else if (math.abs(oldpaper.modified - System.currentTimeMillis()) < 500.millis.toMillis) {

                    Future.successful(
                      JsonResult.error("Paper cannot be saved within 500ms of each other")
                    )
//                  } else if (math.abs(newPaper.modified - System.currentTimeMillis()) > 1.hour.toMillis) {
//
//                    Future.successful(
//                      JsonResult.error("Modified time must be within 1hr of server time")
//                    )
                  } else {

                    val newPaperUpdatedTime =
                      newPaper
                        .updatedTime()
                        .copy(diffs = oldpaper.diffs)
                        .appendDiff(T8Logger.getUpdates(oldpaper, newPaper), req) // TODO specify

                    PaperDAO.save(newPaperUpdatedTime, ow = true).map {
                      le =>
                        JsonResult.success(Paper.model2json(newPaperUpdatedTime))
                    }
                  }
                } else {
                  Future.successful(
                    JsonResult.noPermission)
                }
            }
        }
      }
      for {
        p <- PaperDAO.findByIdModel(id)
        r <- readPaper(p)
      } yield {
        r
      }
  }

  def paperNew = Action.async {
    implicit req =>
      val id = Generator.oid()
      val username = ClientSession.fromReq.map(_.username)
      val newPaper = Paper.createBlank(id, username).appendDiff(Vector("Created paper"), req)
      PaperDAO.save(newPaper).map {
        le =>
          Redirect(routes.Papers.paperView(newPaper._id))
      }
  }

  def recentPaperShorts = Action.async {
    implicit req =>
      val username = ClientSession.fromReq.map(_.username)
      val q = username.map(u =>
        Json.obj(Paper.username -> u))
        .getOrElse(Json.obj(Paper.username -> Json.obj("$exists" -> false)))

      val papers = PaperDAO.find(q, Json.obj(Paper.modified -> -1), 25)
      for {
        papersJson <- papers
      } yield {
        JsonResult.success(papersJson.map(j => j)) // TODO strip data
      }
  }

  def getPaper = Action.async {
    implicit req =>
      req.body.asJson match {
        case Some(j) =>
          tryOrError {
            val id = j asString "_id"
            for {
              p <- PaperDAO.findByIdModel(id)
            } yield {
              val paperJson = Paper.model2json(
                  p.getOrElse(throw new Exception("Paper not found")))
              if (UsernameAuth.canView(p.get.username, ClientSession.fromReq)) {
                JsonResult.success(paperJson)
              } else {
                JsonResult.noPermission
              }
            }
          }
        case None =>
          Future.successful(
            JsonResult.error("Invalid input")
          )
      }
  }

  def duplicatePaper = Action.async {
    implicit req =>
      req.body.asJson match {
        case Some(j) =>
          tryOrError {
            val oldId = j asString "_id"
            for {
              paper <- PaperDAO.findByIdModel(oldId)
              newid <- {
                paper match {
                  case Some(paper) =>
                    val newId = Generator.oid()
                    val nowms = System.currentTimeMillis()
                    if (UsernameAuth.isOwner(paper.username, ClientSession.fromReq.map(_.username))) {
                      val newPaper = paper.copy(
                        _id = newId,
                        created = nowms,
                        modified = nowms,
                        diffs = Vector.empty
                      ).appendDiff(Vector("Duplicated paper"), req)

                      PaperDAO.save(newPaper, ow = false).map {
                        le =>
                          newId
                      }
                    } else {
                      throw new Exception("No permission")
                    }
                  case None =>
                    throw new Exception("Paper not found")
                }
              }
            } yield {
              JsonResult.success(newid)
            }

          }
        case None =>
          Future.successful(JsonResult.error("Invalid input"))
      }
  }

  def searchTags = Action.async {
    implicit req =>
      req.body.asJson match {
        case Some(j) =>
          tryOrError {
            val searchTags = (j \ "tags").as[Vector[String]]
            val tagQ = {
              ClientSession.fromReq.map(_.username).map {
                u =>
                  Json.obj(
                    Paper.username -> u,
                    Paper.tags -> Json.obj("$all" -> searchTags)
                  )
              }.getOrElse {
                Json.obj(Paper.tags -> Json.obj("$all" -> searchTags))
              }
            }
            for {
              r <- PaperDAO.find(tagQ, Json.obj(Paper.modified -> -1))
            } yield {
              JsonResult.success(r)
            }
          }
        case None =>
          Future.successful(JsonResult.error("Invalid input"))
      }
  }

  def deletePaper = Action.async {
    implicit req =>
      req.body.asJson match {
        case Some(j) =>
          tryOrError {
            val paperId = j asString "_id"
            val username = ClientSession.fromReq.map(_.username)
            val q = username.map(u =>
              Json.obj(Paper._id -> paperId, Paper.username -> u))
              .getOrElse(Json.obj(Paper._id -> paperId))
            for {
              a <- PaperDAO.findOneModel(q)
              r <- {
                a match {
                  case Some(p) =>
                    if (UsernameAuth.isOwner(p.username, username)) {
                      PaperDAO.remove(q).map {
                        _ =>
                          JsonResult.success("")
                      }
                    } else {
                      Future.successful {
                        JsonResult.noPermission
                      }
                    }
                  case None =>
                    Future.successful(
                      JsonResult.error("Paper not found")
                    )
                }
              }
            } yield {
              r
            }
          }
        case None =>
          Future.successful(JsonResult.error("Invalid input"))
      }
  }

  def tagCloud = Action.async {
    implicit req =>
      val fm = Aggregation.tagCloud(ClientSession.fromReq.map(_.username))
      for {
        m <- fm
      } yield {
        val desc = m.toVector.sortBy(t => (- t._2, t._1)).map(t =>
          Json.obj(
            "_id" -> t._1,
            "count" -> t._2))
        val total = m.values.sum
        JsonResult.success(desc, Some(total))
      }
  }


}